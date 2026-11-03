
import { useState, type FormEvent } from "react";
import {
  ChefHat,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ArrowRight,
  Package,
  CalendarDays,
  ChartColumn,
  ShieldCheck,
  UserRoundPlus,
  UserRound,
  CheckCircle2,
  KeyRound,
} from "lucide-react";

import { supabase } from "../lib/supabase";

type ModoLogin = "login" | "cadastro" | "recuperacao";

export default function Login() {
  const [modo, setModo] = useState<ModoLogin>("login");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  function mudarModo(novoModo: ModoLogin) {
    setModo(novoModo);
    setErro("");
    setSucesso("");
    setSenha("");
    setMostrarSenha(false);
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (carregando) return;

    setErro("");
    setSucesso("");
    setCarregando(true);

    const emailNormalizado = email.trim().toLowerCase();

    try {
      // RECUPERAÇÃO DE SENHA
      if (modo === "recuperacao") {
        const { error } = await supabase.auth.resetPasswordForEmail(
          emailNormalizado,
          {
            redirectTo: `${window.location.origin}/?recuperar-senha=1`,
          }
        );

        if (error) {
  console.error("Erro na recuperação de senha:", {
    mensagem: error.message,
    status: error.status,
    codigo: error.code,
  });

  setErro(
    "Não foi possível enviar o link de recuperação. Consulte o console para identificar o motivo."
  );

  return;
}

        setSucesso(
          "Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha. Verifique também a pasta de spam."
        );

        return;
      }

      // SOLICITAÇÃO DE CADASTRO
      if (modo === "cadastro") {
        if (nome.trim().length < 3) {
          setErro("Informe seu nome completo.");
          return;
        }

        if (senha.length < 8) {
          setErro("A senha deve conter pelo menos 8 caracteres.");
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: emailNormalizado,
          password: senha,
          options: {
            data: {
              nome: nome.trim(),
            },
          },
        });

        if (error) {
          setErro(
            "Não foi possível concluir a solicitação. Verifique os dados ou tente novamente."
          );
          return;
        }

        // Evita manter uma conta pendente conectada caso
        // a confirmação de e-mail esteja desativada.
        if (data.session) {
          await supabase.auth.signOut();
        }

        setSucesso(
          "Solicitação recebida! Se o cadastro foi criado, confirme seu e-mail caso receba uma mensagem. O acesso dependerá da aprovação da administração."
        );

        setSenha("");
        return;
      }

      // LOGIN
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: emailNormalizado,
          password: senha,
        });

      if (error || !data.user) {
        setErro("Não foi possível entrar. Confira seu e-mail e senha.");
        return;
      }

      // Verifica se a administração autorizou o acesso.
      const { data: perfil, error: erroPerfil } = await supabase
        .from("perfis_acesso")
        .select("funcao, ativo")
        .eq("usuario_id", data.user.id)
        .single();

      if (erroPerfil || !perfil?.ativo) {
        await supabase.auth.signOut();

        setErro(
          "Seu acesso ainda não foi autorizado pela administração."
        );

        return;
      }

      // Acesso da cozinha será liberado após a
      // conclusão da segurança dos módulos.
      if (perfil.funcao !== "administrador") {
        await supabase.auth.signOut();

        setErro(
          "O acesso da equipe de cozinha será disponibilizado em breve."
        );

        return;
      }

      // O AppProtegido reconhecerá a sessão autorizada.
    } catch {
      setErro(
        "Ocorreu um erro de conexão. Verifique sua internet e tente novamente."
      );
    } finally {
      setCarregando(false);
    }
  }

  const titulo =
    modo === "login"
      ? "Bem-vindo ao CAPE"
      : modo === "cadastro"
        ? "Solicitar acesso"
        : "Recuperar senha";

  const descricao =
    modo === "login"
      ? "Entre com suas credenciais para acessar o sistema."
      : modo === "cadastro"
        ? "Preencha seus dados para solicitar autorização."
        : "Informe seu e-mail cadastrado para receber um link de recuperação.";

  const textoBotao =
    modo === "login"
      ? "Entrar no sistema"
      : modo === "cadastro"
        ? "Enviar solicitação"
        : "Enviar link de recuperação";

  return (
    <div className="min-h-screen bg-emerald-950 lg:grid lg:grid-cols-2">
      {/* PAINEL DE APRESENTAÇÃO */}
<section
  className="relative flex min-h-[360px] flex-col justify-between overflow-hidden bg-emerald-950 bg-cover bg-center p-8 text-white lg:min-h-screen lg:p-14"
  style={{
    backgroundImage:
      "linear-gradient(90deg, rgba(0,55,42,0.45), rgba(0,80,46,0.15)), url('/fundo-login.png')",
  }}
>        <div className="absolute -right-24 top-20 h-80 w-80 rounded-full bg-lime-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-orange-400/20 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="rounded-2xl bg-white/15 p-3">
            <ChefHat size={30} />
          </div>

          <div>
            <h1 className="text-3xl font-black tracking-tight">
              CAPE
            </h1>

            <p className="text-sm text-emerald-100">
              Gestão da Alimentação
            </p>
          </div>
        </div>

        <div className="relative my-12 max-w-xl">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-medium">
            <ShieldCheck size={16} />
            Organização, eficiência e cuidado
          </span>

          <h2 className="text-4xl font-bold leading-tight lg:text-5xl">
            Mais organização para cuidar de cada refeição.
          </h2>

          <p className="mt-6 text-base leading-relaxed text-emerald-50/90">
            Um sistema integrado para acompanhar a alimentação,
            planejar cardápios, organizar o estoque e apoiar
            as atividades diárias do CAPE.
          </p>

          <div className="mt-9 grid grid-cols-2 gap-3">
            {[
              { nome: "Gestão de estoque", icone: Package },
              { nome: "Cardápios", icone: CalendarDays },
              { nome: "Relatórios", icone: ChartColumn },
              { nome: "Produção de refeições", icone: ChefHat },
            ].map(({ nome: item, icone: Icone }) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 p-3 text-sm backdrop-blur-sm"
              >
                <Icone
                  size={19}
                  className="shrink-0 text-lime-200"
                />

                {item}
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-emerald-100/75">
          Sistema de Gestão CAPE
        </p>
      </section>

      {/* FORMULÁRIOS DE ACESSO */}
      <section className="flex min-h-[500px] items-center justify-center bg-slate-50 px-5 py-12 lg:px-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
              {modo === "login" ? (
                <LockKeyhole size={29} />
              ) : modo === "cadastro" ? (
                <UserRoundPlus size={29} />
              ) : (
                <KeyRound size={29} />
              )}
            </div>

            <h2 className="text-3xl font-bold text-slate-900">
              {titulo}
            </h2>

            <p className="mt-3 text-slate-500">
              {descricao}
            </p>
          </div>

          <form
            onSubmit={enviar}
            className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/60 sm:p-9"
          >
            {/* NOME: APENAS CADASTRO */}
            {modo === "cadastro" && (
              <>
                <label
                  htmlFor="nome-cape"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Nome completo
                </label>

                <div className="mb-5 flex items-center gap-3 rounded-xl border border-slate-200 px-4 focus-within:border-emerald-600">
                  <UserRound
                    size={19}
                    className="text-slate-400"
                  />

                  <input
                    id="nome-cape"
                    type="text"
                    required
                    minLength={3}
                    maxLength={160}
                    autoComplete="name"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Digite seu nome completo"
                    className="w-full bg-transparent py-4 text-sm outline-none"
                  />
                </div>
              </>
            )}

            {/* E-MAIL: TODOS OS MODOS */}
            <label
              htmlFor="email-cape"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              E-mail
            </label>

            <div className="mb-5 flex items-center gap-3 rounded-xl border border-slate-200 px-4 focus-within:border-emerald-600">
              <Mail
                size={19}
                className="text-slate-400"
              />

              <input
                id="email-cape"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@exemplo.com"
                className="w-full bg-transparent py-4 text-sm outline-none"
              />
            </div>

            {/* SENHA: LOGIN E CADASTRO */}
            {modo !== "recuperacao" && (
              <>
                <label
                  htmlFor="senha-cape"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Senha
                </label>

                <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 focus-within:border-emerald-600">
                  <LockKeyhole
                    size={19}
                    className="text-slate-400"
                  />

                  <input
                    id="senha-cape"
                    type={mostrarSenha ? "text" : "password"}
                    required
                    minLength={
                      modo === "cadastro" ? 8 : undefined
                    }
                    autoComplete={
                      modo === "cadastro"
                        ? "new-password"
                        : "current-password"
                    }
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder={
                      modo === "cadastro"
                        ? "Crie uma senha com pelo menos 8 caracteres"
                        : "Digite sua senha"
                    }
                    className="w-full bg-transparent py-4 text-sm outline-none"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setMostrarSenha(!mostrarSenha)
                    }
                    aria-label={
                      mostrarSenha
                        ? "Ocultar senha"
                        : "Mostrar senha"
                    }
                    className="text-slate-400 hover:text-emerald-700"
                  >
                    {mostrarSenha ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>
                </div>
              </>
            )}

            {/* LINK DE RECUPERAÇÃO */}
            {modo === "login" && (
              <div className="mt-3 text-right">
                <button
                  type="button"
                  onClick={() =>
                    mudarModo("recuperacao")
                  }
                  className="text-sm font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>
            )}

            {/* MENSAGEM DE ERRO */}
            {erro && (
              <p
                role="alert"
                className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700"
              >
                {erro}
              </p>
            )}

            {/* MENSAGEM DE SUCESSO */}
            {sucesso && (
              <div
                role="status"
                className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"
              >
                <CheckCircle2
                  size={19}
                  className="shrink-0"
                />

                <span>{sucesso}</span>
              </div>
            )}

            {/* BOTÃO PRINCIPAL */}
            <button
              type="submit"
              disabled={carregando}
              className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 py-4 font-semibold text-white transition hover:bg-emerald-900 disabled:opacity-60"
            >
              {carregando ? "Aguarde..." : textoBotao}

              {!carregando && (
                <ArrowRight size={19} />
              )}
            </button>

            {/* NAVEGAÇÃO ENTRE MODOS */}
            {modo === "recuperacao" ? (
              <button
                type="button"
                onClick={() => mudarModo("login")}
                className="mt-5 w-full text-center text-sm font-semibold text-emerald-700 hover:underline"
              >
                Voltar para o login
              </button>
            ) : (
              <div className="mt-6 border-t border-slate-100 pt-6 text-center">
                <p className="mb-3 text-sm text-slate-500">
                  {modo === "login"
                    ? "Ainda não possui acesso?"
                    : "Já possui uma conta?"}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    mudarModo(
                      modo === "login"
                        ? "cadastro"
                        : "login"
                    )
                  }
                  className="w-full rounded-xl border border-emerald-700 px-4 py-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
                >
                  {modo === "login"
                    ? "Solicitar cadastro"
                    : "Voltar para o login"}
                </button>
              </div>
            )}
          </form>

          <p className="mt-5 text-center text-xs text-slate-500">
            Acesso exclusivo para funcionários autorizados do CAPE.
          </p>
        </div>
      </section>
    </div>
  );
}
