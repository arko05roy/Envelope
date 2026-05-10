//! envelope-policy — Encrypt FHE Solana program
//!
//! Holds:
//!   - encrypted comp matrix: per-contractor ciphertext(salary_lamports)
//!   - encrypted band ceilings: per-role ciphertext(ceiling)
//!   - approval threshold rule (one #[encrypt_fn]): salary <= ceiling[role]
//!
//! Pre-alpha caveat (per docs.encrypt.xyz): "all data is completely public and
//! stored as plaintext on-chain" — we shape for FHE. README is transparent.
//!
//! TODO(D5): swap the comparison stub below for an actual `#[encrypt_fn]` once
//! `encrypt-anchor` is wired in.

use anchor_lang::prelude::*;

declare_id!("EnVeLoPePoLicY1111111111111111111111111111");

#[program]
pub mod envelope_policy {
    use super::*;

    /// Initialize the policy account for an org.
    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }

    /// Store an encrypted comp row for a contractor.
    pub fn upsert_comp(
        _ctx: Context<UpsertComp>,
        _contractor_id: [u8; 32],
        // TODO: replace Vec<u8> with encrypt-anchor Ciphertext type.
        _encrypted_salary: Vec<u8>,
        _role_band: u8,
    ) -> Result<()> {
        Ok(())
    }

    /// Run the encrypted threshold check for one contractor.
    /// Returns Ok(()) iff the encrypted comparison passes.
    pub fn approve_payroll_row(
        _ctx: Context<ApproveRow>,
        _contractor_id: [u8; 32],
    ) -> Result<()> {
        // TODO(D5): call #[encrypt_fn] threshold(salary_ct, ceiling_ct).
        // For now: stub success so dependent flows can wire end-to-end.
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpsertComp<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ApproveRow<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
}
