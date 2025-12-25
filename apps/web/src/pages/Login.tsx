import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { httpPost } from "../api/http";
import { Container } from "../components/Container";
import { Card } from "../components/Card";

type AuthResp = {
  token: string;
  user: { id: string; username: string; nickname: string };
};

export default function Login() {
  const nav = useNavigate();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [inviteCode, setInviteCode] = useState(""); // 사용자가 직접 입력
  const [error, setError] = useState<string>("");

  function switchMode(next: "login" | "signup") {
    setMode(next);
    setError("");
    setPassword("");
    setConfirmPassword("");
    setNickname("");
    setInviteCode("");
  }

  const canLogin = username.trim().length > 0 && password.length > 0;
  const canSignup =
    username.trim().length > 0 &&
    password.length > 0 &&
    confirmPassword.length > 0 &&
    nickname.trim().length > 0 &&
    inviteCode.trim().length > 0 &&
    password === confirmPassword;

  async function onSubmit() {
    setError("");

    if (mode === "signup") {
      if (!nickname.trim()) {
        setError("닉네임을 입력해줘.");
        return;
      }
      if (password !== confirmPassword) {
        setError("비밀번호와 비밀번호 확인이 일치하지 않아.");
        return;
      }
      if (!inviteCode.trim()) {
        setError("인증번호를 입력해줘.");
        return;
      }
    }

    try {
      const data =
        mode === "login"
          ? await httpPost<AuthResp>("/api/auth/login", { username, password })
          : await httpPost<AuthResp>("/api/auth/signup", {
              username,
              password,
              nickname,
              inviteCode
            });

      localStorage.setItem("token", data.token);
      nav("/lobby");
    } catch (e: any) {
      setError(e?.message ?? "Failed");
    }
  }

  return (
    <Container>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">HackClad</h1>
        <p className="text-sm text-zinc-400">지인 전용 멀티 보드게임</p>
      </div>

      <Card>
        <div className="flex gap-2 mb-4">
          <button
            className={`flex-1 rounded-xl px-3 py-2 text-sm ${
              mode === "login" ? "bg-zinc-100 text-zinc-900" : "bg-zinc-800 text-zinc-200"
            }`}
            onClick={() => switchMode("login")}
          >
            로그인
          </button>
          <button
            className={`flex-1 rounded-xl px-3 py-2 text-sm ${
              mode === "signup" ? "bg-zinc-100 text-zinc-900" : "bg-zinc-800 text-zinc-200"
            }`}
            onClick={() => switchMode("signup")}
          >
            회원가입
          </button>
        </div>

        <div className="grid gap-3">
          <label className="grid gap-1">
            <span className="text-xs text-zinc-400">아이디</span>
            <input
              className="rounded-xl bg-zinc-950/60 border border-zinc-800 px-3 py-2 outline-none focus:border-zinc-600"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-zinc-400">비밀번호</span>
            <input
              className="rounded-xl bg-zinc-950/60 border border-zinc-800 px-3 py-2 outline-none focus:border-zinc-600"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>

          {mode === "signup" && (
            <>
              <label className="grid gap-1">
                <span className="text-xs text-zinc-400">비밀번호 확인</span>
                <input
                  className="rounded-xl bg-zinc-950/60 border border-zinc-800 px-3 py-2 outline-none focus:border-zinc-600"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs text-zinc-400">닉네임</span>
                <input
                  className="rounded-xl bg-zinc-950/60 border border-zinc-800 px-3 py-2 outline-none focus:border-zinc-600"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs text-zinc-400">인증번호</span>
                <input
                  className="rounded-xl bg-zinc-950/60 border border-zinc-800 px-3 py-2 outline-none focus:border-zinc-600"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="지인에게 받은 인증번호"
                />
                <span className="text-[11px] text-zinc-500">
                  인증번호가 있어야 회원가입할 수 있어.
                </span>
              </label>
            </>
          )}

          <button
            className="rounded-xl bg-emerald-500 text-zinc-950 font-medium px-3 py-3 active:scale-[0.99] disabled:opacity-40 disabled:active:scale-100"
            onClick={onSubmit}
            disabled={mode === "signup" ? !canSignup : !canLogin}
          >
            {mode === "login" ? "로그인" : "회원가입"}
          </button>

          {error && <div className="text-sm text-red-400">{error}</div>}
        </div>
      </Card>

      <div className="mt-4 text-xs text-zinc-500">
        모바일에서 입력이 너무 작으면 브라우저 확대(텍스트 크기)를 조절해줘.
      </div>
    </Container>
  );
}
