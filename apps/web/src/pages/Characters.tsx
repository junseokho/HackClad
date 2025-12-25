import { Container } from "../components/Container";
import { Card } from "../components/Card";

export default function Characters() {
  return (
    <Container>
      <Card>
        <div className="text-lg font-bold">캐릭터</div>
        <div className="mt-2 text-sm text-text-dim">
          다음 단계에서 캐릭터 선택/덱 편집 UI를 여기로 옮겨 붙일 거야.
        </div>
      </Card>
    </Container>
  );
}
