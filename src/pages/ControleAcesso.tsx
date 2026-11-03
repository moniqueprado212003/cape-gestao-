
import { useCallback, useEffect, useState } from "react";
import {
  Users,
  UserCheck,
  UserX,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock3,
  LockKeyhole,
} from "lucide-react";
import { supabase } from "../lib/supabase";

type Funcao = "administrador" | "cozinha";

type Perfil = {
  usuario_id: string;
  nome: string;
  funcao: Funcao;
  ativo: boolean;
  criado_em: string;
};

export default function ControleAcesso() {
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [funcoes, setFuncoes] = useState<Record<string, Funcao>>({});
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [meuId, setMeuId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");

    try {
      const { data: usuario, error: erroUsuario } =
        await supabase.auth.getUser();

      if (erroUsuario || !usuario.user) {
        throw new Error("Sua sessão não está disponível.");
      }

      setMeuId(usuario.user.id);

      const { data, error } = await supabase
        .from("perfis_acesso")
        .select("usuario_id, nome, funcao, ativo, criado_em")
        .order("criado_em", { ascending: false });

      if (error) throw error;

      const lista = (data ?? []) as Perfil[];

      setPerfis(lista);
      setFuncoes(
        Object.fromEntries(
          lista.map((perfil) => [perfil.usuario_id, perfil.funcao])
        )
      );
    } catch {
      setErro("Não foi possível carregar os funcionários.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function gerenciar(
    perfil: Perfil,
    novoAtivo: boolean,
    novaFuncao: Funcao
  ) {
    setErro("");
    setSucesso("");

    if (perfil.usuario_id === meuId) {
      setErro("Você não pode alterar seu próprio acesso.");
      return;
    }

    const acao = novoAtivo
      ? perfil.ativo
        ? "alterar o perfil de"
        : "aprovar"
      : perfil.ativo
        ? "bloquear"
        : "recusar ou manter bloqueado";

    if (
      !window.confirm(
        `Deseja ${acao} ${perfil.nome}?\n\n` +
          `Perfil: ${novaFuncao === "administrador" ? "Administrador" : "Cozinha"}\n` +
          `Acesso: ${novoAtivo ? "Autorizado" : "Bloqueado"}`
      )
    ) {
      return;
    }

    setProcessando(perfil.usuario_id);

    try {
      const { error } = await supabase.rpc("gerenciar_acesso", {
        p_usuario_id: perfil.usuario_id,
        p_funcao: novaFuncao,
        p_ativo: novoAtivo,
      });

      if (error) throw error;

      setSucesso(`Permissões de ${perfil.nome} atualizadas com sucesso.`);
      await carregar();
    } catch {
      setErro("Não foi possível atualizar o acesso. Tente novamente.");
    } finally {
      setProcessando(null);
    }
  }

  const pendentes = perfis.filter((perfil) => !perfil.ativo);
  const autorizados = perfis.filter((perfil) => perfil.ativo);

  function cartao(perfil: Perfil) {
    const minhaConta = perfil.usuario_id === meuId;
    const funcaoSelecionada =
      funcoes[perfil.usuario_id] ?? perfil.funcao;

    return (
      <div
        key={perfil.usuario_id}
        className="rounded-2xl border border-slate-200 bg-white p-5"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-semibold text-slate-900">
                {perfil.nome}
              </h4>

              {minhaConta && (
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                  Sua conta
                </span>
              )}

              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  perfil.ativo
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {perfil.ativo ? "Ativo" : "Aguardando / bloqueado"}
              </span>
            </div>

            <p className="mt-2 text-xs text-slate-500">
              Cadastro:{" "}
              {new Date(perfil.criado_em).toLocaleDateString("pt-BR")}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              aria-label={`Perfil de ${perfil.nome}`}
              value={funcaoSelecionada}
              disabled={minhaConta || processando === perfil.usuario_id}
              onChange={(evento) =>
                setFuncoes((anterior) => ({
                  ...anterior,
                  [perfil.usuario_id]: evento.target.value as Funcao,
                }))
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
            >
              <option value="cozinha">Cozinha</option>
              <option value="administrador">Administrador</option>
            </select>

            {perfil.ativo ? (
              <>
                {!minhaConta && funcaoSelecionada !== perfil.funcao && (
                  <button
                    type="button"
                    disabled={processando !== null}
                    onClick={() =>
                      void gerenciar(perfil, true, funcaoSelecionada)
                    }
                    className="rounded-xl bg-emerald-700 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
                  >
                    Salvar perfil
                  </button>
                )}

                <button
                  type="button"
                  disabled={minhaConta || processando !== null}
                  onClick={() =>
                    void gerenciar(perfil, false, perfil.funcao)
                  }
                  className="flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-3 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-40"
                >
                  <UserX size={17} />
                  Bloquear
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={processando !== null}
                  onClick={() =>
                    void gerenciar(perfil, true, funcaoSelecionada)
                  }
                  className="flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  <UserCheck size={17} />
                  Aprovar / Reativar
                </button>

                <button
                  type="button"
                  disabled={processando !== null}
                  onClick={() =>
                    void gerenciar(perfil, false, funcaoSelecionada)
                  }
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Manter bloqueado
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-emerald-700" size={25} />
            <h3 className="text-xl font-bold text-slate-900">
              Controle de Acesso
            </h3>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            Gerencie solicitações e permissões dos funcionários.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void carregar()}
          disabled={carregando}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={17} />
          Atualizar
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            titulo: "Total de contas",
            valor: perfis.length,
            icone: Users,
          },
          {
            titulo: "Autorizadas",
            valor: autorizados.length,
            icone: UserCheck,
          },
          {
            titulo: "Pendentes / bloqueadas",
            valor: pendentes.length,
            icone: Clock3,
          },
        ].map(({ titulo, valor, icone: Icone }) => (
          <div
            key={titulo}
            className="rounded-2xl border border-slate-200 bg-white p-5"
          >
            <Icone className="mb-3 text-emerald-700" size={23} />
            <p className="text-sm text-slate-500">{titulo}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {valor}
            </p>
          </div>
        ))}
      </div>

      {erro && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <AlertCircle size={19} />
          {erro}
        </div>
      )}

      {sucesso && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          <CheckCircle2 size={19} />
          {sucesso}
        </div>
      )}

      {carregando ? (
        <p className="py-8 text-center text-sm text-slate-500">
          Carregando funcionários...
        </p>
      ) : (
        <>
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-lg font-semibold">
              <Clock3 size={20} className="text-amber-600" />
              Aguardando autorização / bloqueados
            </h4>

            {pendentes.length === 0 ? (
              <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                Nenhuma conta aguardando autorização ou bloqueada.
              </p>
            ) : (
              pendentes.map(cartao)
            )}
          </div>

          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-lg font-semibold">
              <UserCheck size={20} className="text-emerald-700" />
              Funcionários autorizados
            </h4>

            {autorizados.map(cartao)}
          </div>
        </>
      )}

      <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900">
        <LockKeyhole size={21} className="shrink-0" />
        <p>
          As alterações de permissão são verificadas pelo Supabase.
          Funcionários da cozinha ainda não podem acessar o aplicativo:
          a liberação ocorrerá após a conclusão da segurança dos módulos.
          Contas bloqueadas não recebem acesso aos dados protegidos.
        </p>
      </div>
    </section>
  );
}
