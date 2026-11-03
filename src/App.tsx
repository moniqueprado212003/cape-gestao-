
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ClipboardCheck,
  ChefHat,
  Package,
  CalendarDays,
  ChartColumn,
  Settings,
  Bell,
  Users,
  UserRound,
  AlertTriangle,
  ArrowRight,
  Menu,
  X,
  LogOut,
} from "lucide-react";

import Estudantes from "./pages/Estudantes";
import Frequencia from "./pages/Frequencia";
import Cozinha from "./pages/Cozinha";
import Configuracoes from "./pages/Configuracoes";
import Estoque from "./pages/Estoque";
import Cardapio from "./pages/Cardapio";
import Relatorios from "./pages/Relatorios";
import Login from "./pages/Login";
import RedefinirSenha from "./pages/RedefinirSenha";

import { useEstudantes } from "./context/EstudantesContext";
import { useFrequencia } from "./context/FrequenciaContext";
import { useEstoque } from "./context/EstoqueContext";
import { supabase } from "./lib/supabase";

const menus = [
  { nome: "Painel Geral", icone: LayoutDashboard },
  { nome: "Estudantes", icone: UserRound },
  { nome: "Controle de Frequência", icone: ClipboardCheck },
  { nome: "Cozinha", icone: ChefHat },
  { nome: "Estoque", icone: Package },
  { nome: "Cardápio", icone: CalendarDays },
  { nome: "Relatórios", icone: ChartColumn },
  { nome: "Configurações", icone: Settings },
];

function dataLocal(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

// PAINEL PRINCIPAL DO CAPE
function App() {
  const [pagina, setPagina] = useState("Painel Geral");
  const [menuAberto, setMenuAberto] = useState(false);

  const { estudantes } = useEstudantes();
  const { registros } = useFrequencia();
  const { produtos, lotes } = useEstoque();

  const hoje = dataLocal(new Date());

  const presentesHoje = registros.filter(
    (registro) =>
      registro.data === hoje &&
      registro.entradaReal !== null &&
      registro.saidaReal === null
  );

  const quantidadePresentes = presentesHoje.length;

  const restricoesPresentes = estudantes.filter(
    (estudante) =>
      estudante.restricao === "sim" &&
      presentesHoje.some(
        (registro) => registro.estudanteId === estudante.id
      )
  ).length;

  const produtosEstoqueBaixo = produtos.filter(
    (produto) =>
      produto.quantidade <= produto.estoqueMinimo
  );

  const lotesVencidos = lotes.filter(
    (lote) =>
      lote.quantidade > 0 &&
      lote.validade !== "" &&
      lote.validade < hoje
  );

  const indicadores = [
    {
      titulo: "Estudantes presentes",
      valor: quantidadePresentes,
      icone: Users,
    },
    {
      titulo: "Restrições alimentares",
      valor: restricoesPresentes,
      icone: AlertTriangle,
    },
    {
      titulo: "Produtos cadastrados",
      valor: produtos.length,
      icone: Package,
    },
    {
      titulo: "Estoque baixo",
      valor: produtosEstoqueBaixo.length,
      icone: Bell,
    },
  ];

  function navegar(destino: string) {
    setPagina(destino);
    setMenuAberto(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 md:flex">
      {/* MENU LATERAL */}
      <aside
        className={`${
          menuAberto ? "block" : "hidden"
        } md:block w-full md:w-64 bg-teal-900 text-white p-5 md:min-h-screen`}
      >
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-2xl font-bold">
              CAPE
            </h1>

            <p className="text-xs text-teal-200">
              Gestão de Alimentação
            </p>
          </div>

          <button
            type="button"
            className="md:hidden"
            onClick={() => setMenuAberto(false)}
            aria-label="Fechar menu"
          >
            <X />
          </button>
        </div>

        <nav className="space-y-2">
          {menus.map(({ nome, icone: Icone }) => (
            <button
              key={nome}
              type="button"
              onClick={() => navegar(nome)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition ${
                pagina === nome
                  ? "bg-teal-700"
                  : "hover:bg-teal-800"
              }`}
            >
              <Icone size={19} />
              {nome}
            </button>
          ))}
        </nav>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 min-w-0">
        {/* CABEÇALHO */}
        <header className="bg-white border-b border-slate-200 p-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="md:hidden"
              onClick={() => setMenuAberto(true)}
              aria-label="Abrir menu"
            >
              <Menu />
            </button>

            <div>
              <h2 className="font-semibold text-xl">
                {pagina}
              </h2>

              <p className="text-sm text-slate-500">
                Sistema de Gestão do CAPE
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex rounded-full bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-800">
              Administrador
            </span>

            <button
              type="button"
              onClick={async () => {
                const { error } =
                  await supabase.auth.signOut();

                if (error) {
                  alert(
                    "Não foi possível sair. Tente novamente."
                  );
                }
              }}
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              <LogOut size={17} />
              Sair
            </button>
          </div>
        </header>

        {/* ÁREA DAS PÁGINAS */}
        <div className="p-5 md:p-8 max-w-7xl mx-auto">
          {pagina === "Painel Geral" ? (
            <>
              <div className="mb-8">
                <h3 className="text-2xl font-bold">
                  Visão geral da instituição
                </h3>

                <p className="text-slate-500 mt-1">
                  Acompanhe a frequência, a alimentação
                  e o estoque.
                </p>

                <p className="text-xs text-amber-700 mt-2">
                  Ambiente de testes. Utilize apenas
                  dados fictícios.
                </p>
              </div>

              {/* INDICADORES */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                {indicadores.map(
                  ({ titulo, valor, icone: Icone }) => (
                    <div
                      key={titulo}
                      className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
                    >
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-sm text-slate-500">
                          {titulo}
                        </span>

                        <Icone
                          className="text-teal-700"
                          size={22}
                        />
                      </div>

                      <p className="text-3xl font-bold">
                        {valor}
                      </p>
                    </div>
                  )
                )}
              </div>

              {/* PAINÉIS INFORMATIVOS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                {/* ATENÇÃO ALIMENTAR */}
                <section className="bg-white rounded-2xl border border-slate-200 p-6">
                  <h4 className="text-lg font-semibold mb-4">
                    Atenção alimentar
                  </h4>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex gap-3">
                      <AlertTriangle className="text-amber-700 shrink-0" />

                      <p className="text-sm text-amber-900">
                        {restricoesPresentes > 0
                          ? `Existem ${restricoesPresentes} estudante(s) presente(s) com restrições alimentares cadastradas.`
                          : "Nenhum estudante presente com restrição alimentar cadastrada no momento."}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => navegar("Cozinha")}
                    className="mt-5 text-teal-700 font-medium flex items-center gap-2"
                  >
                    Acessar cozinha
                    <ArrowRight size={17} />
                  </button>
                </section>

                {/* SITUAÇÃO DO ESTOQUE */}
                <section className="bg-white rounded-2xl border border-slate-200 p-6">
                  <h4 className="text-lg font-semibold mb-4">
                    Situação do estoque
                  </h4>

                  <div className="space-y-2 text-sm text-slate-600">
                    <p>
                      {produtosEstoqueBaixo.length === 0
                        ? "Nenhum produto no limite ou abaixo do estoque mínimo."
                        : `${produtosEstoqueBaixo.length} produto(s) no limite ou abaixo do estoque mínimo.`}
                    </p>

                    {lotesVencidos.length > 0 && (
                      <p className="text-amber-700 font-medium">
                        Atenção: {lotesVencidos.length} lote(s)
                        vencido(s) com saldo em estoque.
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => navegar("Estoque")}
                    className="mt-5 text-teal-700 font-medium flex items-center gap-2"
                  >
                    Consultar estoque
                    <ArrowRight size={17} />
                  </button>
                </section>
              </div>
            </>
          ) : pagina === "Estudantes" ? (
            <Estudantes />
          ) : pagina === "Controle de Frequência" ? (
            <Frequencia />
          ) : pagina === "Cozinha" ? (
            <Cozinha />
          ) : pagina === "Configurações" ? (
            <Configuracoes />
          ) : pagina === "Estoque" ? (
            <Estoque />
          ) : pagina === "Cardápio" ? (
            <Cardapio />
          ) : pagina === "Relatórios" ? (
            <Relatorios />
          ) : (
            <section className="bg-white rounded-2xl border border-slate-200 p-8">
              <h3 className="text-2xl font-bold mb-3">
                {pagina}
              </h3>

              <p className="text-slate-500">
                Este módulo será desenvolvido nas
                próximas etapas.
              </p>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

// CONTROLE DE ACESSO E RECUPERAÇÃO DE SENHA
function AppProtegido() {
  // A tela de recuperação deve aparecer antes do painel.
  // O parâmetro também é usado no link enviado por e-mail.
  const emRecuperacao =
    new URLSearchParams(window.location.search).get(
      "recuperar-senha"
    ) === "1";

  const [verificando, setVerificando] = useState(true);
  const [autorizado, setAutorizado] = useState(false);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    // Não executar a verificação administrativa
    // durante a redefinição de senha.
    if (emRecuperacao) {
      return;
    }

    let ativo = true;
    let versao = 0;

    async function verificarAcesso() {
      const atual = ++versao;

      if (ativo) {
        setVerificando(true);
      }

      try {
        const { data, error } =
          await supabase.auth.getUser();

        if (!ativo || atual !== versao) return;

        if (error || !data.user) {
          setAutorizado(false);
          setMensagem("");
          return;
        }

        const { data: perfil, error: erroPerfil } =
          await supabase
            .from("perfis_acesso")
            .select("funcao, ativo")
            .eq("usuario_id", data.user.id)
            .single();

        if (!ativo || atual !== versao) return;

        if (
          erroPerfil ||
          !perfil?.ativo ||
          perfil.funcao !== "administrador"
        ) {
          setAutorizado(false);
          setMensagem(
            "Sua conta não possui acesso administrativo autorizado."
          );
          return;
        }

        setAutorizado(true);
        setMensagem("");
      } catch {
        if (ativo && atual === versao) {
          setAutorizado(false);
          setMensagem(
            "Não foi possível verificar seu acesso. Tente novamente."
          );
        }
      } finally {
        if (ativo && atual === versao) {
          setVerificando(false);
        }
      }
    }

    const { data: listener } =
      supabase.auth.onAuthStateChange(() => {
        // Executa a verificação fora do callback
        // para evitar conflitos com a autenticação.
        setTimeout(() => {
          if (ativo) {
            void verificarAcesso();
          }
        }, 0);
      });

    void verificarAcesso();

    return () => {
      ativo = false;
      versao++;
      listener.subscription.unsubscribe();
    };
  }, [emRecuperacao]);

  // PRIORIDADE: TELA DE REDEFINIÇÃO
  if (emRecuperacao) {
    return <RedefinirSenha />;
  }

  // AGUARDANDO VERIFICAÇÃO
  if (verificando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-700" />

          <h2 className="text-xl font-bold text-emerald-900">
            CAPE
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Verificando seu acesso...
          </p>
        </div>
      </div>
    );
  }

  // USUÁRIO SEM ACESSO ADMINISTRATIVO
  if (!autorizado) {
    return (
      <>
        {mensagem && (
          <div
            role="alert"
            className="bg-amber-50 px-4 py-3 text-center text-sm text-amber-900"
          >
            {mensagem}

            <button
              type="button"
              className="ml-3 font-semibold underline"
              onClick={async () => {
                await supabase.auth.signOut();
                setMensagem("");
              }}
            >
              Sair da conta
            </button>
          </div>
        )}

        <Login />
      </>
    );
  }

  // USUÁRIO ADMINISTRADOR AUTORIZADO
  return <App />;
}

export default AppProtegido;
