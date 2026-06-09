import { z } from "zod";

export const DeckCandidateDecisionSchema = z
  .object({
    decision: z.enum(["approved", "linked", "duplicate", "rejected"]),
    targetDeckId: z.uuid().nullable().optional(),
    note: z.string().trim().max(500).nullable().optional(),
  })
  .superRefine((value, context) => {
    if (value.decision === "linked" && !value.targetDeckId) {
      context.addIssue({
        code: "custom",
        path: ["targetDeckId"],
        message: "연결할 공개 덱을 선택해주세요.",
      });
    }

    if (value.decision === "rejected" && !value.note) {
      context.addIssue({
        code: "custom",
        path: ["note"],
        message: "반려 사유를 입력해주세요.",
      });
    }
  });

export type DeckCandidateDecision = z.infer<
  typeof DeckCandidateDecisionSchema
>;

export function candidateCanUseDeckCode(
  codeValidationStatus: string,
) {
  return codeValidationStatus === "valid";
}
