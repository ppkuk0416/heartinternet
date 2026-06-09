import type { Metadata } from "next";
import { Database, EyeOff, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "개인정보 안내",
  description: "HearthDeck Hub 기술 알파의 개인정보와 분석 데이터 처리 안내",
};

export default function PrivacyPage() {
  return (
    <div className="page-shell py-10 sm:py-14">
      <div className="max-w-3xl">
        <span className="eyebrow">
          <ShieldCheck size={14} />
          Privacy
        </span>
        <h1 className="mt-2 text-4xl font-black tracking-[-0.055em] sm:text-5xl">
          개인정보 안내
        </h1>
        <p className="section-copy mt-4">
          이 문서는 HearthDeck Hub 기술 알파가 어떤 정보를 사용하고, 무엇을
          저장하지 않는지 설명합니다. 공개 베타 전에 실제 운영 주체와 문의
          채널을 반영해 다시 고지해야 합니다.
        </p>
      </div>

      <div className="mt-8 grid max-w-4xl gap-5">
        <PolicySection
          icon={<Database size={19} />}
          title="수집하거나 저장하는 정보"
        >
          <ul>
            <li>로그인용 이메일과 Supabase 인증 식별자</li>
            <li>프로필 표시 이름과 사용자가 게시한 덱·가이드·댓글</li>
            <li>추천, 즐겨찾기, 신고 및 운영 처리 기록</li>
            <li>덱 목록·상세·복사·등록 단계의 제한된 제품 분석 이벤트</li>
            <li>보안과 남용 방지를 위한 짧은 기간의 요청 처리 정보</li>
          </ul>
        </PolicySection>

        <PolicySection icon={<EyeOff size={19} />} title="저장하지 않는 정보">
          <ul>
            <li>덱 코드 미리보기 요청의 원문을 서버 애플리케이션 로그에 남기지 않습니다.</li>
            <li>제품 분석 이벤트에 이메일, 댓글 본문, 원문 덱 코드를 넣지 않습니다.</li>
            <li>익명 복사·분석 집계에 원본 IP 주소를 DB에 저장하지 않습니다.</li>
            <li>하스스톤 계정 비밀번호나 Battle.net 로그인 정보를 받지 않습니다.</li>
          </ul>
        </PolicySection>

        <PolicySection title="익명 분석과 보관">
          <p>
            비로그인 방문자의 복사와 제품 이벤트는 서버 비밀키로 생성한 일일
            HMAC 해시로 묶습니다. 이 값은 원본 네트워크 주소를 복원하기 위한
            용도가 아니며 날짜가 바뀌면 새 값이 됩니다.
          </p>
          <p>
            기술 알파의 보관 기간은 아직 운영 환경에서 확정되지 않았습니다.
            공개 베타 전에는 분석 이벤트, 신고, 감사 로그의 보관 기간과 삭제
            절차를 운영 런북에 확정해야 합니다.
          </p>
        </PolicySection>

        <PolicySection title="삭제와 문의">
          <p>
            작성자는 본인 댓글을 삭제할 수 있습니다. 계정 삭제, 게시 덱 삭제,
            개인정보 열람 요청은 공개 베타 운영 문의 채널이 마련된 뒤 그
            채널을 통해 처리합니다.
          </p>
          <p>
            현재는 기술 알파이므로 실제 개인정보를 입력하거나 장기간 보관할
            데이터를 게시하지 않는 것을 권장합니다.
          </p>
        </PolicySection>

        <p className="text-xs font-bold text-[var(--muted)]">
          기준일: 2026년 6월 8일 · 기술 알파 안내
        </p>
      </div>
    </div>
  );
}

function PolicySection({
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
