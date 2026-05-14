import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, Check, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: CheckinPage,
});

// Configurable webhook URL — replace with your endpoint
const WEBHOOK_URL = "https://webhook.site/your-webhook-id";

type Companion = { id: string; name: string; birthdate: string };

type FormState = {
  fullName: string;
  whatsapp: string;
  birthdate: string;
  companions: Companion[];
  checkin: string;
  checkout: string;
  acceptTerms: boolean;
};

const initialState: FormState = {
  fullName: "",
  whatsapp: "",
  birthdate: "",
  companions: [],
  checkin: "",
  checkout: "",
  acceptTerms: false,
};

function CheckinPage() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const validateStep = (s: number): boolean => {
    const e: Record<string, string> = {};
    if (s === 1) {
      if (!data.fullName.trim()) e.fullName = "Informe o nome completo";
      if (!data.whatsapp.trim()) e.whatsapp = "Informe seu WhatsApp";
      else if (data.whatsapp.replace(/\D/g, "").length < 10) e.whatsapp = "WhatsApp inválido";
      if (!data.birthdate) e.birthdate = "Informe a data de nascimento";
    }
    if (s === 2) {
      data.companions.forEach((c, i) => {
        if (!c.name.trim()) e[`comp-name-${i}`] = "Nome obrigatório";
        if (!c.birthdate) e[`comp-date-${i}`] = "Data obrigatória";
      });
    }
    if (s === 3) {
      if (!data.checkin) e.checkin = "Informe a data de check-in";
      if (!data.checkout) e.checkout = "Informe a data de check-out";
      if (data.checkin && data.checkout && data.checkout <= data.checkin)
        e.checkout = "Check-out deve ser após o check-in";
      if (!data.acceptTerms) e.acceptTerms = "É necessário aceitar os termos";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => validateStep(step) && setStep((s) => s + 1);
  const back = () => setStep((s) => Math.max(1, s - 1));

  const addCompanion = () =>
    update("companions", [
      ...data.companions,
      { id: crypto.randomUUID(), name: "", birthdate: "" },
    ]);

  const removeCompanion = (id: string) =>
    update("companions", data.companions.filter((c) => c.id !== id));

  const updateCompanion = (id: string, field: "name" | "birthdate", value: string) =>
    update(
      "companions",
      data.companions.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    );

  const submit = async () => {
    if (!validateStep(3)) return;
    setSubmitting(true);
    try {
      await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mainGuest: {
            fullName: data.fullName,
            whatsapp: data.whatsapp,
            birthdate: data.birthdate,
          },
          companions: data.companions.map(({ name, birthdate }) => ({ name, birthdate })),
          stay: { checkin: data.checkin, checkout: data.checkout },
          acceptedTerms: data.acceptTerms,
          submittedAt: new Date().toISOString(),
        }),
      });
      setSuccess(true);
    } catch {
      setErrors({ submit: "Erro ao enviar. Tente novamente." });
    } finally {
      setSubmitting(false);
    }
  };

  if (success) return <SuccessScreen />;

  return (
    <main className="min-h-screen bg-background px-5 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-xl">
        <header className="text-center mb-8">
          <h1 className="font-display text-5xl sm:text-6xl text-[var(--olive)] tracking-tight">
            Almorão
          </h1>
          <p className="mt-2 text-sm uppercase tracking-[0.3em] text-[var(--olive-light)]">
            Check-in Digital
          </p>
        </header>

        <Stepper step={step} />

        <section className="mt-6 rounded-2xl bg-card p-6 sm:p-8 shadow-sm border border-[var(--border)]">
          {step === 1 && (
            <div className="space-y-5">
              <StepTitle title="Hóspede Principal" subtitle="Informe seus dados pessoais" />
              <Field label="Nome Completo" error={errors.fullName}>
                <Input
                  value={data.fullName}
                  onChange={(v) => update("fullName", v)}
                  placeholder="Seu nome completo"
                />
              </Field>
              <Field label="WhatsApp" error={errors.whatsapp}>
                <Input
                  value={data.whatsapp}
                  onChange={(v) => update("whatsapp", formatPhone(v))}
                  placeholder="(11) 99999-9999"
                  inputMode="tel"
                />
              </Field>
              <Field label="Data de Nascimento" error={errors.birthdate}>
                <Input
                  type="date"
                  value={data.birthdate}
                  onChange={(v) => update("birthdate", v)}
                />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <StepTitle
                title="Acompanhantes"
                subtitle="Adicione outras pessoas que se hospedarão com você"
              />
              {data.companions.length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  Nenhum acompanhante adicionado.
                </p>
              )}
              <div className="space-y-4">
                {data.companions.map((c, i) => (
                  <div
                    key={c.id}
                    className="rounded-xl border-2 border-[var(--border)] p-4 space-y-3 bg-background/40"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium uppercase tracking-wider text-[var(--olive-light)]">
                        Acompanhante {i + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeCompanion(c.id)}
                        className="text-[var(--olive)] hover:text-destructive transition-colors"
                        aria-label="Remover"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <Field label="Nome" error={errors[`comp-name-${i}`]}>
                      <Input
                        value={c.name}
                        onChange={(v) => updateCompanion(c.id, "name", v)}
                        placeholder="Nome completo"
                      />
                    </Field>
                    <Field label="Data de Nascimento" error={errors[`comp-date-${i}`]}>
                      <Input
                        type="date"
                        value={c.birthdate}
                        onChange={(v) => updateCompanion(c.id, "birthdate", v)}
                      />
                    </Field>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addCompanion}
                className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--border)] py-3 text-[var(--olive)] hover:border-[var(--olive)] hover:bg-[var(--olive)]/5 transition-colors"
              >
                <Plus size={18} />
                <span className="font-medium">Adicionar acompanhante</span>
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <StepTitle title="Sua Estadia" subtitle="Confirme as datas e aceite os termos" />
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Check-in" error={errors.checkin}>
                  <Input
                    type="date"
                    value={data.checkin}
                    onChange={(v) => update("checkin", v)}
                  />
                </Field>
                <Field label="Check-out" error={errors.checkout}>
                  <Input
                    type="date"
                    value={data.checkout}
                    onChange={(v) => update("checkout", v)}
                  />
                </Field>
              </div>
              <label className="flex items-start gap-3 cursor-pointer rounded-xl border-2 border-[var(--border)] p-4 hover:border-[var(--olive)] transition-colors">
                <input
                  type="checkbox"
                  checked={data.acceptTerms}
                  onChange={(e) => update("acceptTerms", e.target.checked)}
                  className="mt-0.5 h-5 w-5 rounded border-2 border-[var(--border)] accent-[var(--olive)] cursor-pointer"
                />
                <span className="text-sm text-foreground/80">
                  Li e aceito os{" "}
                  <span className="text-[var(--olive)] font-medium underline">
                    termos e condições
                  </span>{" "}
                  da hospedagem na Pousada Almorão.
                </span>
              </label>
              {errors.acceptTerms && (
                <p className="text-sm text-destructive -mt-2">{errors.acceptTerms}</p>
              )}
              {errors.submit && (
                <p className="text-sm text-destructive">{errors.submit}</p>
              )}
            </div>
          )}

          <div className="mt-8 flex items-center justify-between gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={back}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-[var(--olive)] font-medium hover:bg-[var(--olive)]/5 transition-colors"
              >
                <ArrowLeft size={18} />
                Voltar
              </button>
            ) : (
              <span />
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={next}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--olive)] text-[var(--cream)] font-medium hover:bg-[var(--olive-light)] transition-colors"
              >
                Avançar
                <ArrowRight size={18} />
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--olive)] text-[var(--cream)] font-medium hover:bg-[var(--olive-light)] transition-colors disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    Concluir Check-in
                  </>
                )}
              </button>
            )}
          </div>
        </section>

        <footer className="mt-8 text-center text-xs text-muted-foreground">
          Pousada Almorão · Refúgio em meio à natureza
        </footer>
      </div>
    </main>
  );
}

function Stepper({ step }: { step: number }) {
  const steps = ["Hóspede", "Acompanhantes", "Estadia"];
  return (
    <div className="flex items-center gap-2">
      {steps.map((label, i) => {
        const n = i + 1;
        const active = n === step;
        const done = n < step;
        return (
          <div key={label} className="flex-1 flex items-center gap-2">
            <div className="flex flex-col items-center gap-1 flex-1">
              <div
                className={`h-1.5 w-full rounded-full transition-colors ${
                  active || done ? "bg-[var(--olive)]" : "bg-[var(--border)]"
                }`}
              />
              <span
                className={`text-[11px] uppercase tracking-wider ${
                  active ? "text-[var(--olive)] font-semibold" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StepTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-2">
      <h2 className="font-display text-2xl text-[var(--olive)]">{title}</h2>
      <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground/80">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: "tel" | "text" | "email" | "numeric";
}) {
  return (
    <input
      type={type}
      inputMode={inputMode}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border-2 border-[var(--border)] bg-card px-4 py-3 text-base text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-[var(--olive)] focus:ring-2 focus:ring-[var(--olive)]/20"
    />
  );
}

function formatPhone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function SuccessScreen() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-lg w-full text-center rounded-3xl bg-card p-10 sm:p-14 border border-[var(--border)] shadow-sm">
        <div className="mx-auto h-16 w-16 rounded-full bg-[var(--olive)] flex items-center justify-center mb-6">
          <Check className="text-[var(--cream)]" size={32} strokeWidth={2.5} />
        </div>
        <p
          className="text-3xl sm:text-4xl leading-snug text-[var(--olive)]"
          style={{ fontFamily: "Caveat, cursive" }}
        >
          Sua estadia começa agora.
          <br />
          Bem-vindo ao refúgio!
        </p>
        <p className="mt-6 text-sm text-muted-foreground">
          Recebemos seus dados. Em breve entraremos em contato pelo WhatsApp.
        </p>
      </div>
    </main>
  );
}
