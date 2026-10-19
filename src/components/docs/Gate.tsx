import { useEffect, useRef, useState, type FormEvent } from 'react';

const GATE_CODE = '200306';

type Props = {
  onUnlock: () => void;
};

export default function Gate({ onUnlock }: Props) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (password.trim() === GATE_CODE) {
      onUnlock();
      return;
    }
    setError(true);
    setPassword('');
    inputRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-[#e6e6e6] text-neutral-900 flex flex-col items-center justify-center px-6">
      <h1 className="quo-mark text-center text-[42px] sm:text-[64px] md:text-[88px] text-neutral-900 max-w-[16ch]">
        Wellcome Quo-Mo
      </h1>
      <p className="mt-6 text-[13px] tracking-[0.18em] uppercase text-neutral-500">
        僅限管理員登入
      </p>
      <form onSubmit={submit} className="mt-10 w-full max-w-sm space-y-3">
        <label className="block">
          <span className="sr-only">管理員密碼</span>
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(false);
            }}
            placeholder="密碼"
            className={`w-full rounded-2xl border bg-white px-5 py-3.5 text-center text-[18px] tracking-[0.32em] outline-none ${
              error ? 'border-red-500' : 'border-neutral-300 focus:border-neutral-900'
            }`}
          />
        </label>
        {error && <p className="text-center text-[13px] text-red-600">密碼不正確</p>}
        <button
          type="submit"
          className="w-full rounded-2xl bg-neutral-900 px-5 py-3.5 text-[14px] text-white"
        >
          進入
        </button>
      </form>
    </div>
  );
}
