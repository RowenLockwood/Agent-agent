"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import type { AuthorPaymentDetailsRecord } from "@/lib/paymentDetails";
import type { PaymentStageField, PaymentStages } from "@/lib/stages";
import { ContractDetailsBox } from "./ContractDetailsBox";
import { PaymentDetailsStages } from "./PaymentDetailsStages";

type Props = {
  authorId: string;
  paymentDetails: AuthorPaymentDetailsRecord;
  onPaymentStageUpdate: (field: PaymentStageField, value: string) => void;
  onPaymentDetailsChange: (next: AuthorPaymentDetailsRecord) => void;
};

/**
 * Collapsible Payment Details section, modeled on the Editors dropdown for
 * visual consistency: same expand chevron, same animation, same border, same
 * inner panel. Collapsed by default so the row stays compact when the
 * information isn't being inspected.
 */
export function PaymentDetailsDropdown({
  authorId,
  paymentDetails,
  onPaymentStageUpdate,
  onPaymentDetailsChange,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const paymentStages: PaymentStages = {
    contractSentToEditorStage: paymentDetails.contractSentToEditorStage,
    backAndForthWithEditorStage: paymentDetails.backAndForthWithEditorStage,
    contractSignedByAuthorStage: paymentDetails.contractSignedByAuthorStage,
    contractSignedByEditorStage: paymentDetails.contractSignedByEditorStage,
    contractSignedByAllPartiesStage:
      paymentDetails.contractSignedByAllPartiesStage,
    paymentReceivedFromEditorStage:
      paymentDetails.paymentReceivedFromEditorStage,
    paymentSentToAuthorStage: paymentDetails.paymentSentToAuthorStage,
  };

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1.5 text-[0.92rem] font-sans font-medium transition-colors focus:outline-none focus-visible:underline"
          style={{ color: "var(--color-ink-soft)" }}
          aria-expanded={expanded}
        >
          <motion.span
            animate={{ rotate: expanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
            className="inline-block"
            aria-hidden="true"
          >
            ›
          </motion.span>
          Payment Details
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="payment-details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.2, 0.6, 0.2, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div
              className="border-t px-4 sm:px-6 py-4 mt-4"
              style={{ borderColor: "var(--color-rule-soft)" }}
            >
              <section className="mb-4">
                <h3
                  className="smallcaps text-[0.82rem] mb-3"
                  style={{ color: "var(--color-ink-soft)" }}
                >
                  Payment Stages
                </h3>
                <PaymentDetailsStages
                  stages={paymentStages}
                  onUpdate={onPaymentStageUpdate}
                />
              </section>

              <ContractDetailsBox
                authorId={authorId}
                paymentDetails={paymentDetails}
                onPaymentDetailsChange={onPaymentDetailsChange}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
