
import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

// ======================================================
// CONFIGURAÇÃO DO ARMAZENAMENTO LOCAL
// ======================================================

const CHAVE_REFEICOES = "cape_gestao_refeicoes_v1";

// ======================================================
// TIPOS
// ======================================================

export type TipoRefeicao =
  | "lanche_manha"
  | "almoco"
  | "lanche_tarde";

export type ConfiguracaoRefeicao = {
  id: TipoRefeicao;
  nome: string;
  horario: string;
};

type RefeicoesContextType = {
  refeicoes: ConfiguracaoRefeicao[];

  atualizarHorario: (
    id: TipoRefeicao,
    horario: string
  ) => void;
};

// ======================================================
// CONFIGURAÇÕES PADRÃO
// ======================================================

const configuracaoInicial: ConfiguracaoRefeicao[] = [
  {
    id: "lanche_manha",
    nome: "Lanche da manhã",
    horario: "09:15",
  },
  {
    id: "almoco",
    nome: "Almoço",
    horario: "12:00",
  },
  {
    id: "lanche_tarde",
    nome: "Lanche da tarde",
    horario: "15:15",
  },
];

// ======================================================
// CONTEXTO
// ======================================================

const RefeicoesContext = createContext<
  RefeicoesContextType | undefined
>(undefined);

// ======================================================
// VALIDAÇÃO DO HORÁRIO
// ======================================================

function horarioValido(horario: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(horario);
}

// ======================================================
// RECUPERAÇÃO DOS HORÁRIOS SALVOS
// ======================================================

function carregarRefeicoes(): ConfiguracaoRefeicao[] {
  try {
    const dadosSalvos = localStorage.getItem(
      CHAVE_REFEICOES
    );

    if (!dadosSalvos) {
      return configuracaoInicial.map((refeicao) => ({
        ...refeicao,
      }));
    }

    const dados: unknown = JSON.parse(dadosSalvos);

    if (!Array.isArray(dados)) {
      console.warn(
        "As configurações salvas das refeições estão em formato inválido."
      );

      return configuracaoInicial.map((refeicao) => ({
        ...refeicao,
      }));
    }

    // Mantém as três refeições padrão e recupera
    // somente horários válidos para cada uma.
    return configuracaoInicial.map((refeicaoPadrao) => {
      const configuracaoSalva = dados.find(
        (item) =>
          item !== null &&
          typeof item === "object" &&
          item.id === refeicaoPadrao.id
      );

      if (
        configuracaoSalva &&
        typeof configuracaoSalva.horario === "string" &&
        horarioValido(configuracaoSalva.horario)
      ) {
        return {
          ...refeicaoPadrao,
          horario: configuracaoSalva.horario,
        };
      }

      return {
        ...refeicaoPadrao,
      };
    });
  } catch (erro) {
    console.error(
      "Erro ao carregar os horários das refeições:",
      erro
    );

    return configuracaoInicial.map((refeicao) => ({
      ...refeicao,
    }));
  }
}

// ======================================================
// PROVIDER
// ======================================================

export function RefeicoesProvider({
  children,
}: {
  children: ReactNode;
}) {
  // Recupera os horários salvos ao iniciar.
  const [refeicoes, setRefeicoes] = useState<
    ConfiguracaoRefeicao[]
  >(carregarRefeicoes);

  // Salva automaticamente sempre que um
  // horário de refeição for alterado.
  useEffect(() => {
    try {
      localStorage.setItem(
        CHAVE_REFEICOES,
        JSON.stringify(refeicoes)
      );
    } catch (erro) {
      console.error(
        "Erro ao salvar os horários das refeições:",
        erro
      );
    }
  }, [refeicoes]);

  // ====================================================
  // ATUALIZAR HORÁRIO
  // ====================================================

  function atualizarHorario(
    id: TipoRefeicao,
    horario: string
  ) {
    // Impede horários inválidos.
    if (!horarioValido(horario)) {
      return;
    }

    setRefeicoes((lista) =>
      lista.map((refeicao) =>
        refeicao.id === id
          ? {
              ...refeicao,
              horario,
            }
          : refeicao
      )
    );
  }

  // ====================================================
  // DISPONIBILIZAÇÃO DO CONTEXTO
  // ====================================================

  return (
    <RefeicoesContext.Provider
      value={{
        refeicoes,
        atualizarHorario,
      }}
    >
      {children}
    </RefeicoesContext.Provider>
  );
}

// ======================================================
// HOOK
// ======================================================

export function useRefeicoes() {
  const contexto = useContext(RefeicoesContext);

  if (!contexto) {
    throw new Error(
      "useRefeicoes deve ser utilizado dentro de RefeicoesProvider."
    );
  }

  return contexto;
}
