//! envelope-policy — Solana program governing an Envelope organization's
//! treasury policy. PDA-keyed by the user's wallet pubkey (`owner`); the
//! `payer` (server keypair) covers rent and signs.
//!
//! Why server-paid: treasury operations don't ask the user to sign every
//! payroll batch. Authorization happens at the API layer; this program
//! enforces invariants (monthly cap, cosigner count, dWallet binding) on-chain.
//!
//! Devnet program ID: 7xVNMJycAC5sQo1MaJTn8gHrbHBtkmuTbpBjrkC1Jo1H
//!
//! Future: an `__ika_cpi_authority` PDA derived from this program's id is the
//! intended dWallet authority. After binding, every payroll signature flows
//! through this program's CPI to Ika's `approve_message`.

use anchor_lang::prelude::*;

declare_id!("7xVNMJycAC5sQo1MaJTn8gHrbHBtkmuTbpBjrkC1Jo1H");

#[program]
pub mod envelope_policy {
    use super::*;

    /// Initialize policy for an org keyed by `owner` wallet pubkey.
    pub fn init_policy(
        ctx: Context<InitPolicy>,
        monthly_cap_lamports: u64,
        cosigners: u8,
    ) -> Result<()> {
        require!(cosigners >= 1, EnvelopeError::InvalidCosignerCount);
        let policy = &mut ctx.accounts.policy;
        policy.owner = ctx.accounts.owner.key();
        policy.dwallet = Pubkey::default();
        policy.monthly_cap_lamports = monthly_cap_lamports;
        policy.cosigners_required = cosigners;
        policy.batches_approved = 0;
        policy.lamports_approved_this_period = 0;
        policy.period_start_unix = Clock::get()?.unix_timestamp;
        policy.bump = ctx.bumps.policy;
        emit!(PolicyInitialized { owner: policy.owner, cap: monthly_cap_lamports });
        Ok(())
    }

    /// Bind an Ika dWallet to this org's policy. The dWallet's authority must
    /// have been transferred to this program's `__ika_cpi_authority` PDA.
    pub fn bind_dwallet(ctx: Context<UpdatePolicy>, dwallet: Pubkey) -> Result<()> {
        let policy = &mut ctx.accounts.policy;
        policy.dwallet = dwallet;
        emit!(DWalletBound { owner: policy.owner, dwallet });
        Ok(())
    }

    /// Update the monthly spending cap.
    pub fn update_cap(ctx: Context<UpdatePolicy>, monthly_cap_lamports: u64) -> Result<()> {
        let policy = &mut ctx.accounts.policy;
        policy.monthly_cap_lamports = monthly_cap_lamports;
        Ok(())
    }

    /// Approve a payroll batch on-chain. Validates cap; produces a
    /// `BatchApproval` PDA recording (batch_hash, total, count, ts).
    /// Future: CPIs into Ika `approve_message` for dWallet signing.
    pub fn approve_payroll_batch(
        ctx: Context<ApprovePayrollBatch>,
        batch_hash: [u8; 32],
        total_lamports: u64,
        recipient_count: u32,
    ) -> Result<()> {
        let policy = &mut ctx.accounts.policy;
        let now = Clock::get()?.unix_timestamp;
        const PERIOD_SECS: i64 = 30 * 24 * 60 * 60;
        if now - policy.period_start_unix >= PERIOD_SECS {
            policy.period_start_unix = now;
            policy.lamports_approved_this_period = 0;
        }
        let next_total = policy
            .lamports_approved_this_period
            .checked_add(total_lamports)
            .ok_or(EnvelopeError::Overflow)?;
        require!(next_total <= policy.monthly_cap_lamports, EnvelopeError::CapExceeded);

        policy.lamports_approved_this_period = next_total;
        policy.batches_approved = policy.batches_approved.saturating_add(1);

        let approval = &mut ctx.accounts.approval;
        approval.policy = policy.key();
        approval.batch_hash = batch_hash;
        approval.total_lamports = total_lamports;
        approval.recipient_count = recipient_count;
        approval.approved_at = now;
        approval.bump = ctx.bumps.approval;

        emit!(BatchApproved {
            policy: policy.key(),
            batch_hash,
            total_lamports,
            recipient_count,
        });
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitPolicy<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + Policy::SIZE,
        seeds = [b"policy", owner.key().as_ref()],
        bump,
    )]
    pub policy: Account<'info, Policy>,
    /// CHECK: only used as PDA seed; not asked to sign
    pub owner: UncheckedAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdatePolicy<'info> {
    #[account(
        mut,
        seeds = [b"policy", owner.key().as_ref()],
        bump = policy.bump,
    )]
    pub policy: Account<'info, Policy>,
    /// CHECK: PDA seed
    pub owner: UncheckedAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(batch_hash: [u8; 32])]
pub struct ApprovePayrollBatch<'info> {
    #[account(
        mut,
        seeds = [b"policy", owner.key().as_ref()],
        bump = policy.bump,
    )]
    pub policy: Account<'info, Policy>,
    #[account(
        init,
        payer = payer,
        space = 8 + BatchApproval::SIZE,
        seeds = [b"approval", policy.key().as_ref(), &batch_hash],
        bump,
    )]
    pub approval: Account<'info, BatchApproval>,
    /// CHECK: PDA seed
    pub owner: UncheckedAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Policy {
    pub owner: Pubkey,
    pub dwallet: Pubkey,
    pub monthly_cap_lamports: u64,
    pub cosigners_required: u8,
    pub bump: u8,
    pub batches_approved: u64,
    pub lamports_approved_this_period: u64,
    pub period_start_unix: i64,
}
impl Policy {
    pub const SIZE: usize = 32 + 32 + 8 + 1 + 1 + 8 + 8 + 8;
}

#[account]
pub struct BatchApproval {
    pub policy: Pubkey,
    pub batch_hash: [u8; 32],
    pub total_lamports: u64,
    pub recipient_count: u32,
    pub approved_at: i64,
    pub bump: u8,
}
impl BatchApproval {
    pub const SIZE: usize = 32 + 32 + 8 + 4 + 8 + 1;
}

#[event]
pub struct PolicyInitialized { pub owner: Pubkey, pub cap: u64 }
#[event]
pub struct DWalletBound { pub owner: Pubkey, pub dwallet: Pubkey }
#[event]
pub struct BatchApproved {
    pub policy: Pubkey,
    pub batch_hash: [u8; 32],
    pub total_lamports: u64,
    pub recipient_count: u32,
}

#[error_code]
pub enum EnvelopeError {
    #[msg("Cosigner count must be at least 1")]
    InvalidCosignerCount,
    #[msg("Payroll batch would exceed the monthly cap")]
    CapExceeded,
    #[msg("Lamport overflow")]
    Overflow,
}
