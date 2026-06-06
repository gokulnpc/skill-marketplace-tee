"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Icon } from "@/components/shared/Icon";
import { fetchBuyerBalance } from "@/lib/api";
import { DEFAULT_BUYER_ID } from "@/lib/constants";

function Logo() {
  return (
    <Link href="/" style={{ display: "flex", alignItems: "center", gap: 11 }}>
      <span
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: "var(--seal)",
          color: "var(--bg)",
          display: "grid",
          placeItems: "center",
        }}
      >
        <Icon name="seal" size={17} stroke={1.5} />
      </span>
      <span style={{ lineHeight: 1, textAlign: "left" }}>
        <span style={{ fontWeight: 600, letterSpacing: "-0.01em", fontSize: 15.5 }}>
          SkillVault<span style={{ color: "var(--accent)" }}>·</span>TEE
        </span>
        <span
          className="mono"
          style={{
            display: "block",
            fontSize: 9.5,
            color: "var(--mute)",
            marginTop: 3,
            letterSpacing: ".04em",
            whiteSpace: "nowrap",
          }}
        >
          private skill marketplace · attested enclave
        </span>
      </span>
    </Link>
  );
}

function isMarketplaceActive(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/skills/") ||
    pathname.startsWith("/evaluations/")
  );
}

export function TopBar() {
  const pathname = usePathname();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    fetchBuyerBalance(DEFAULT_BUYER_ID)
      .then(setBalance)
      .catch(() => setBalance(0));
  }, [pathname]);

  const navItems = [
    { href: "/", label: "Marketplace", active: isMarketplaceActive(pathname) },
    { href: "/seller", label: "Sell", active: pathname.startsWith("/seller") || pathname === "/upload" },
    { href: "/licenses", label: "My licenses", active: pathname.startsWith("/licenses") },
  ];

  return (
    <header
      style={{
        borderBottom: "1px solid var(--line)",
        background: "color-mix(in oklab, var(--bg) 86%, transparent)",
        position: "sticky",
        top: 0,
        zIndex: 60,
        backdropFilter: "saturate(1.1) blur(8px)",
      }}
    >
      <div
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          padding: "13px 30px",
          display: "flex",
          alignItems: "center",
          gap: 26,
        }}
      >
        <Logo />
        <nav style={{ display: "flex", gap: 4, fontSize: 13.5 }}>
          {navItems.map(({ href, label, active }) => (
            <Link
              key={href}
              href={href}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                color: active ? "var(--ink)" : "var(--mute)",
                fontWeight: active ? 500 : 400,
                background: active ? "var(--bg-2)" : "transparent",
              }}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div style={{ flex: 1 }} />
        <div
          className="mono"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 11.5,
            color: "var(--mute)",
            whiteSpace: "nowrap",
          }}
        >
          <span
            className="live-dot"
            style={{ width: 7, height: 7, borderRadius: 99, background: "var(--accent)" }}
          />
          enclave online · runner attested
        </div>
        <Link
          href="/licenses"
          className="mono btn btn-ghost"
          style={{ padding: "7px 12px", fontSize: 12.5, gap: 7, display: "inline-flex", alignItems: "center" }}
        >
          <Icon name="coin" size={14} /> ${balance ?? "—"} USDC
        </Link>
        <Link href="/upload" className="btn btn-primary">
          <Icon name="upload" size={15} /> List a skill
        </Link>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--ink)", background: "var(--bg-2)", marginTop: 24 }}>
      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "52px 30px 40px" }}>
        <div
          className="serif"
          style={{ fontSize: "clamp(46px, 7vw, 104px)", lineHeight: 0.94, letterSpacing: "-0.03em" }}
        >
          Bring your benchmark.
          <br />
          <span className="italic" style={{ color: "var(--mute)" }}>
            Keep your data.
          </span>
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 28,
            justifyContent: "space-between",
            marginTop: 40,
            paddingTop: 22,
            borderTop: "1px solid var(--line)",
          }}
        >
          <div className="mono" style={{ fontSize: 11.5, color: "var(--mute)", maxWidth: 360, lineHeight: 1.7 }}>
            The skill, the model, the verifier and your benchmark all run inside one attested Phala TEE. Only the
            score, the proof, and approved output ever leave.
          </div>
          <div style={{ display: "flex", gap: 48 }}>
            {(
              [
                ["Product", ["Marketplace", "How it works", "Pricing"]],
                ["Trust", ["Attestation", "Open-weight models", "Leakage guard"]],
                ["Build", ["Seller guide", "API", "Status"]],
              ] as const
            ).map(([heading, items]) => (
              <div key={heading}>
                <div className="label" style={{ marginBottom: 12 }}>
                  {heading}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 9, fontSize: 13.5, color: "var(--ink-2)" }}>
                  {items.map((item) => (
                    <span key={item} style={{ cursor: "default" }}>
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div
          className="mono"
          style={{
            fontSize: 10.5,
            color: "var(--faint)",
            marginTop: 34,
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <span>SkillVault TEE · v0.4</span>
          <span>Phala TDX · vLLM local inference · Ed25519 receipts</span>
          <span>0 bytes of buyer data leave the enclave</span>
        </div>
      </div>
    </footer>
  );
}
