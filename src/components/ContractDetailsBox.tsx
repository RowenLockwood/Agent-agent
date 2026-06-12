"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";
import { updateContractDetailsAction } from "@/app/actions";
import type { AuthorPaymentDetailsRecord } from "@/lib/paymentDetails";
import type { RenewalIntervalUnit } from "@/lib/royalties";
import { CommissionBox } from "./CommissionBox";
import { LockedSectionNotice } from "./LockedSectionNotice";
import { RoyaltiesBox } from "./RoyaltiesBox";

type Patch = {
  commissionAmount?: number | null;
  commissionPercentForAgency?: number | null;
  firstRoyaltyStatementDate?: string | null;
  renewalIntervalNumber?: number | null;
  renewalIntervalUnit?: RenewalIntervalUnit | null;
  lastSentToAuthorDate?: string | null;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

type Props = {
  authorId: string;
  paymentDetails: AuthorPaymentDetailsRecord;
  /** Updated with the server's authoritative payment details on each save. */
  onPaymentDetailsChange: (next: AuthorPaymentDetailsRecord) => void;
};

const SAVED_FLASH_MS = 1400;
const ERROR_FLASH_MS = 4000;

export function ContractDetailsBox({
  authorId,
  paymentDetails,
  onPaymentDetailsChange,
}: Props) {
  const unlocked =
    paymentDetails.contractSignedByAllPartiesStage === "completed";
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const flashRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function save(patch: Patch) {
    if (flashRef.current) clearTimeout(flashRef.current);
    setStatus("saving");
    setErrorMessage(null);
    const r = await updateContractDetailsAction(authorId, patch);
    if (r.ok) {
      onPaymentDetailsChange(r.paymentDetails);
      setStatus("saved");
      flashRef.current = setTimeout(() => setStatus("idle"), SAVED_FLASH_MS);
    } else {
      setStatus("error");
      setErrorMessage(r.error);
      flashRef.current = setTimeout(() => setStatus("idle"), ERROR_FLASH_MS);
    }
  }

  return (
    <section
      className="rounded-[3px] p-4"
      style={{
        border: "1px solid var(--color-rule-soft)",
        background: "var(--color-paper-soft)",
      }}
    >
      <header className="flex items-center justify-between mb-3">
        <h3
          className="smallcaps text-[0.88rem]"
          style={{ color: "var(--color-ink-muted)" }}
        >
          Contract Details
        </h3>
        <SaveStatusPill status={status} />
      </header>

      {!unlocked ? (
        <LockedSectionNotice
          message="Contract details unlock once the contract is signed by all parties."
        />
      ) : (
        <div className="flex flex-col gap-3.5">
          <CommissionBox
            commissionAmount={paymentDetails.commissionAmount}
            commissionPercentForAgency={paymentDetails.commissionPercentForAgency}
            onChange={save}
          />
          <RoyaltiesBox
            firstRoyaltyStatementDate={paymentDetails.firstRoyaltyStatementDate}
            renewalIntervalNumber={paymentDetails.renewalIntervalNumber}
            renewalIntervalUnit={paymentDetails.renewalIntervalUnit}
            lastSentToAuthorDate={paymentDetails.lastSentToAuthorDate}
            nextSendToAuthorDate={paymentDetails.nextSendToAuthorDate}
            onChange={save}
          />
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                key={errorMessage}
                initial={{ opacity: 0, y: -3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="text-[0.85rem] font-serif italic"
                style={{ color: "var(--color-wine)" }}
              >
                {errorMessage}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}

function SaveStatusPill({ status }: { status: SaveStatus }) {
  const text =
    status === "saving"
      ? "Saving…"
      : status === "saved"
        ? "Saved"
        : status === "error"
          ? "Couldn't save"
          : "";
  return (
    <span
      aria-live="polite"
      className="smallcaps text-[0.62rem] min-h-[0.9rem] inline-flex"
    >
      <AnimatePresence mode="wait">
        {text && (
          <motion.span
            key={text}
            initial={{ opacity: 0, y: 1 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -1 }}
            transition={{ duration: 0.22 }}
            style={{
              color:
                status === "error"
                  ? "var(--color-wine)"
                  : "var(--color-ink-muted)",
            }}
          >
            {text}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
