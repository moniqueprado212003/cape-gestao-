
import { useEffect, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { supabase } from "../lib/supabase";

type Estado = "verificando" | "pronto" | "invalido" | "concluido";

export default function RedefinirSenha() {
  const [estado, setEstado] = useState<Estado>("verificando");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;

    async function verificarLink() {
      const parametros = new URLSearchParams(window.location.search);
      const codigo = parametros.get("code");
      const tokenHash = parametros.get("token_hash");
      const tipo = parametros.get("type");

      const hash = new URLSearchParams(
        window.location.hash.replace(/^#/, "")
      );

      if (hash.get("error") || parametros.get("error")) {
        if (ativo) setEstado("invalido");
        return;
      }

      try {
        if (tokenHash && tipo === "recovery") {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "recovery",
          });

          if (error) throw error;
        } else if (codigo) {
          const { error } =
            await supabase.auth.exchangeCodeForSession(codigo);

          if (error) {
            const { data } = await supabase.auth.getSession();
            if (!data.session) throw error;
          }
        } else if (hash.get("access_token")) {
          // O cliente Supabase pode processar o link automaticamente.
          // Aguardamos a inicialização da sessão.
        } else {
          if (ativo) setEstado("invalido");
          return;
        }

        const { data, error } = await supabase.auth.getUser();

        if (!ativo) return;

        if (error || !data.user) {
          setEstado("invalido");
          return;
        }

        // Remove os tokens da barra de endereços.
        window.history.replaceState(
          {},
          "",
          `${window.location.pathname}?recuperar-senha=1`
        );

        setEstado("pronto");
      } catch {
        if (ativo) setEstado("invalido");
      }
    }

    void verificarLink();

    return () => {
      ativo = false;
    };
  }, []);

  async function salvarNovaSenha(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro("");

    if (senha.length < 8) {
      setErro("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    if (senha !== confirmacao) {
      setErro("As senhas informadas não são iguais.");
      return;
    }

    setSalvando(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: senha,
      });

      if (error) {
        setErro(
          "Não foi possível atualizar a senha. Solicite um novo link."
        );
        return;
      }

      setSenha("");
      setConfirmacao("");
      setEstado("concluido");

      // Encerra a sessão criada pelo link de recuperação.
      await supabase.auth.signOut();
    } catch {
      setErro("Ocorreu um erro de conexão. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  function voltarLogin() {
    window.location.replace(window.location.origin);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-950 via-emerald-800 to-lime-700 px-5 py-10">
      <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl sm:p-10">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
            {estado === "concluido" ? (
              <CheckCircle2 size={30} />
            ) : (
              <KeyRound size={30} />
            )}
          </div>

          <h1 className="text-3xl font-bold text-slate-900">
            {estado === "concluido"
              ? "Senha atualizada!"
              : "Redefinir senha"}
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            Sistema de Gestão CAPE
          </p>
        </div>

        {estado === "verificando" && (
          <div className="py-6 text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-700" />
            <p className="text-sm text-slate-500">
              Verificando seu link de recuperação...
            </p>
          </div>
        )}

        {estado === "invalido" && (
          <div className="space-y-5">
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
            >
              <AlertCircle size={21} className="shrink-0" />
              <p>
                O link de recuperação é inválido, expirou ou já
                foi utilizado. Volte ao login e solicite outro.
              </p>
            </div>

            <button
              type="button"
              onClick={voltarLogin}
              className="w-full rounded-xl bg-emerald-800 px-5 py-4 font-semibold text-white hover:bg-emerald-900"
            >
              Voltar ao login
            </button>
          </div>
        )}

        {estado === "pronto" && (
          <form onSubmit={salvarNovaSenha} className="space-y-5">
            <div className="flex items-start gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
              <ShieldCheck size={20} className="shrink-0" />
              <p>
                Link verificado. Crie uma nova senha para sua conta.
              </p>
            </div>

            <div>
              <label
                htmlFor="nova-senha"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Nova senha
              </label>

              <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 focus-within:border-emerald-600">
                <LockKeyhole size={19} className="text-slate-400" />

                <input
                  id="nova-senha"
                  type={mostrarSenha ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Mínimo de 8 caracteres"
                  className="w-full bg-transparent py-4 text-sm outline-none"
                />

                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  aria-label={
                    mostrarSenha ? "Ocultar senha" : "Mostrar senha"
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
            </div>

            <div>
              <label
                htmlFor="confirmar-senha"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Confirmar nova senha
              </label>

              <input
                id="confirmar-senha"
                type={mostrarSenha ? "text" : "password"}
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                placeholder="Digite novamente a nova senha"
                className="w-full rounded-xl border border-slate-200 px-4 py-4 text-sm outline-none focus:border-emerald-600"
              />
            </div>

            {erro && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
              >
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={salvando}
              className="w-full rounded-xl bg-emerald-800 px-5 py-4 font-semibold text-white hover:bg-emerald-900 disabled:opacity-60"
            >
              {salvando ? "Salvando..." : "Salvar nova senha"}
            </button>
          </form>
        )}

        {estado === "concluido" && (
          <div className="space-y-5">
            <div
              role="status"
              className="flex items-start gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900"
            >
              <CheckCircle2 size={21} className="shrink-0" />
              <p>
                Sua senha foi alterada. Agora você pode entrar
                no CAPE utilizando a nova senha.
              </p>
            </div>

            <button
              type="button"
              onClick={voltarLogin}
              className="w-full rounded-xl bg-emerald-800 px-5 py-4 font-semibold text-white hover:bg-emerald-900"
            >
              Ir para o login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
