import type { Metadata } from "next";
import { BadgeCheck, Ban, MessagesSquare, Scale } from "lucide-react";

export const metadata: Metadata = {
  title: "이용 규칙",
  description: "HearthDeck Hub 덱 등록, 댓글, 출처와 신고 처리 규칙",
};

export default function RulesPage() {
  return (
    <div className="page-shell py-10 sm:py-14">
      <div className="max-w-3xl">
        <span className="eyebrow">
          <Scale size={14} />
          Community rules
        </span>
        <h1 className="mt-2 text-4xl font-black tracking-[-0.055em] sm:text-5xl">
          이용 규칙
        </h1>
        <p className="section-copy mt-4">
          HearthDeck Hub는 자유 게시판보다 덱 코드와 플레이 가이드를 중심으로
          운영합니다. 정확한 코드, 분명한 출처, 실제로 도움이 되는 설명이
          커뮤니티의 기본입니다.
        </p>
      </div>

      <div className="mt-8 grid max-w-4xl gap-5">
        <RuleSection icon={<BadgeCheck size={19} />} title="덱과 근거">
          <ul>
            <li>본인이 확인한 유효한 하스스톤 덱 코드만 등록합니다.</li>
            <li>승률과 등급은 원자료가 있거나 본인 입력임을 분명히 표시합니다.</li>
            <li>프로·스트리머·대회 덱은 가능한 한 원본 URL과 작성자를 남깁니다.</li>
            <li>다른 사람의 가이드나 설명을 허락 없이 복사하지 않습니다.</li>
            <li>이전 패치 덱을 현재 메타 덱처럼 오인시키지 않습니다.</li>
          </ul>
        </RuleSection>

        <RuleSection icon={<MessagesSquare size={19} />} title="댓글과 상호작용">
          <ul>
            <li>덱의 운영, 카드 선택, 매치업과 관련된 내용으로 대화합니다.</li>
            <li>욕설, 괴롭힘, 혐오 표현, 반복 광고와 도배를 금지합니다.</li>
            <li>작성자의 등급이나 실력을 근거 없이 조롱하지 않습니다.</li>
            <li>의견과 사실을 구분하고, 잘못된 정보는 근거와 함께 수정 요청합니다.</li>
          </ul>
        </RuleSection>

        <RuleSection icon={<Ban size={19} />} title="금지 콘텐츠">
          <ul>
            <li>허위 승률·등급·대회 성적 또는 조작된 출처</li>
            <li>악성 코드, 피싱, 계정 거래와 게임 약관 위반을 조장하는 링크</li>
            <li>개인정보 노출, 사칭, 저작권을 침해하는 무단 복제물</li>
            <li>자동 생성된 내용을 검증 없이 실제 플레이 경험처럼 게시하는 행위</li>
          </ul>
        </RuleSection>

        <RuleSection title="신고와 운영 처리">
          <p>
            유저는 덱과 댓글을 스팸, 욕설, 허위 정보, 저작권 문제로 신고할 수
            있습니다. 운영자는 원문과 감사 로그를 확인한 뒤 기각, 검토 중,
            숨김 처리를 선택합니다.
          </p>
          <p>
            긴급한 개인정보 노출이나 악성 링크는 우선 숨김 처리한 뒤 사실
            관계를 확인합니다. 단순한 덱 취향 차이나 반대 의견은 숨김 사유가
            아닙니다.
          </p>
        </RuleSection>

        <RuleSection title="운영 원칙">
          <p>
            자동 수집된 덱은 운영자 검토 없이 공개하지 않습니다. 운영진 확인
            라벨은 출처와 코드가 검토됐다는 뜻이며, 미래 승률이나 성능을
            보증한다는 뜻이 아닙니다.
          </p>
          <p>
            반복 위반 콘텐츠는 숨김 또는 게시 제한 대상이 될 수 있습니다.
            계정 제재와 이의 제기 절차는 공개 베타 운영 주체가 확정된 뒤
            추가합니다.
          </p>
        </RuleSection>

        <p className="text-xs font-bold text-[var(--muted)]">
          기준일: 2026년 6월 8일 · 기술 알파 규칙
        </p>
      </div>
    </div>
  );
}

function RuleSection({
  icon,
  title,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface rounded-[1.5rem] p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-xl font-black tracking-[-0.035em]">
        {icon}
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm font-semibold leading-7 text-[var(--muted)] [&_li]:ml-5 [&_li]:list-disc">
        {children}
      </div>
    </section>
  );
}
