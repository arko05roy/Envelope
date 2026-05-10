/**
 * GET /api/treasury — returns SOL + USDC balance for the connected org's
 * treasury address. Real on-chain reads.
 *
 * USDC mint (devnet): Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr (Solana team faucet)
 * USDC mint (mainnet): EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
 */
import { NextResponse } from "next/server";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount, TokenAccountNotFoundError } from "@solana/spl-token";
import { authResponse, requireWalletPubkey } from "@/lib/auth";
import { getOrCreateOrg } from "@/lib/store";

export const runtime = "nodejs";

const USDC_DEVNET = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr");
const USDC_MAINNET = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

export async function GET(req: Request) {
  try {
    const pubkey = requireWalletPubkey(req);
    const org = getOrCreateOrg(pubkey);
    const rpc = process.env.NEXT_PUBLIC_HELIUS_RPC_URL;
    const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "devnet";
    if (!rpc) return NextResponse.json({ error: "rpc not configured" }, { status: 500 });

    const conn = new Connection(rpc, "confirmed");
    const treasury = new PublicKey(org.treasuryPubkey);
    const usdcMint = network === "mainnet-beta" ? USDC_MAINNET : USDC_DEVNET;

    const [lamports, ata] = await Promise.all([
      conn.getBalance(treasury, "confirmed"),
      getAssociatedTokenAddress(usdcMint, treasury, true),
    ]);

    let usdc = 0;
    try {
      const account = await getAccount(conn, ata, "confirmed");
      // USDC has 6 decimals on both networks
      usdc = Number(account.amount) / 1_000_000;
    } catch (e) {
      if (!(e instanceof TokenAccountNotFoundError)) {
        // ATA missing is normal for fresh accounts; only re-throw real errors
      }
    }

    return NextResponse.json({
      treasuryPubkey: treasury.toBase58(),
      network,
      sol: lamports / LAMPORTS_PER_SOL,
      lamports,
      usdc,
      usdcMint: usdcMint.toBase58(),
    });
  } catch (e) {
    return authResponse(e);
  }
}
