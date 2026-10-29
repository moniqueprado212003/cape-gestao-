
import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

import type { TipoRefeicao } from "./RefeicoesContext";

// ======================================================
// CONFIGURAÇÃO DO ARMAZENAMENTO LOCAL
// ======================================================

const CHAVE_CARDAPIO = "cape_gestao_cardapio_v1";

// ======================================================
// TIPOS
// ======================================================

export type PlanejamentoCardapio = {
  id: number;
  data: string;
  refeicaoId: TipoRefeicao;
  receitasIds: number[];
};

type CardapioContextType = {
  planejamentos: PlanejamentoCardapio[];

  salvarPlanejamento: (
    data: string,
    refeicaoId: TipoRefeicao,
    receitasIds: number[]
  ) => void;

  excluirPlanejamento: (id: number) => void;
};

// ======================================================
// CONTEXTO
// ======================================================

const CardapioContext = createContext<
  CardapioContextType | undefined
>(undefined);

// ======================================================
// RECUPERAÇÃO DOS PLANEJAMENTOS SALVOS
// ======================================================

function carregarPlanejamentos(): PlanejamentoCardapio[] {
  try {
    const dadosSalvos = localStorage.getItem(
      CHAVE_CARDAPIO
    );

    if (!dadosSalvos) {
      return [];
    }

    const dados: unknown = JSON.parse(dadosSalvos);

    if (!Array.isArray(dados)) {
      console.warn(
        "Os dados salvos do cardápio estão em formato inválido."
      );

      return [];
    }

    return dados as PlanejamentoCardapio[];
  } catch (erro) {
    console.error(
      "Erro ao carregar os planejamentos do cardápio:",
      erro
    );

    return [];
  }
}

// ======================================================
// PROVIDER
// ======================================================

export function CardapioProvider({
  children,
}: {
  children: ReactNode;
}) {
  // Recupera os planejamentos salvos ao iniciar.
  const [planejamentos, setPlanejamentos] = useState<
    PlanejamentoCardapio[]
  >(carregarPlanejamentos);

  // Salva automaticamente sempre que um planejamento
  // for criado, alterado ou excluído.
  useEffect(() => {
    try {
      localStorage.setItem(
        CHAVE_CARDAPIO,
        JSON.stringify(planejamentos)
      );
    } catch (erro) {
      console.error(
        "Erro ao salvar os planejamentos do cardápio:",
        erro
      );
    }
  }, [planejamentos]);

  // ====================================================
  // SALVAR OU ATUALIZAR PLANEJAMENTO
  // ====================================================

  function salvarPlanejamento(
    data: string,
    refeicaoId: TipoRefeicao,
    receitasIds: number[]
  ) {
    // Impede que a mesma receita seja incluída
    // mais de uma vez na mesma refeição.
    const receitasUnicas = [...new Set(receitasIds)];

    setPlanejamentos((anteriores) => {
      // Verifica se já existe um planejamento
      // para a mesma data e refeição.
      const existente = anteriores.find(
        (planejamento) =>
          planejamento.data === data &&
          planejamento.refeicaoId === refeicaoId
      );

      // Se existir, atualiza as receitas.
      if (existente) {
        return anteriores.map((planejamento) =>
          planejamento.id === existente.id
            ? {
                ...planejamento,
                receitasIds: receitasUnicas,
              }
            : planejamento
        );
      }

      // Se não existir, cria um novo planejamento.
      return [
        ...anteriores,
        {
          id: Date.now() + Math.random(),
          data,
          refeicaoId,
          receitasIds: receitasUnicas,
        },
      ];
    });
  }

  // ====================================================
  // EXCLUIR PLANEJAMENTO
  // ====================================================

  function excluirPlanejamento(id: number) {
    setPlanejamentos((anteriores) =>
      anteriores.filter(
        (planejamento) => planejamento.id !== id
      )
    );
  }

  // ====================================================
  // DISPONIBILIZAÇÃO DO CONTEXTO
  // ====================================================

  return (
    <CardapioContext.Provider
      value={{
        planejamentos,
        salvarPlanejamento,
        excluirPlanejamento,
      }}
    >
      {children}
    </CardapioContext.Provider>
  );
}

// ======================================================
// HOOK
// ======================================================

export function useCardapio() {
  const contexto = useContext(CardapioContext);

  if (!contexto) {
    throw new Error(
      "useCardapio deve ser utilizado dentro de CardapioProvider."
    );
  }

  return contexto;
}
