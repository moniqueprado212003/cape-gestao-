
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

const CHAVE_RECEITAS = "cape_gestao_receitas_v1";

// ======================================================
// TIPOS
// ======================================================

export type IngredienteReceita = {
  produtoId: number;
  quantidade: number;
};

export type Receita = {
  id: number;
  nome: string;
  porcoes: number;
  ingredientes: IngredienteReceita[];
  modoPreparo: string;
};

type NovaReceita = Omit<Receita, "id">;

type ReceitasContextType = {
  receitas: Receita[];
  adicionarReceita: (receita: NovaReceita) => void;
  excluirReceita: (id: number) => void;
};

// ======================================================
// CONTEXTO
// ======================================================

const ReceitasContext = createContext<
  ReceitasContextType | undefined
>(undefined);

// ======================================================
// RECUPERAÇÃO DAS RECEITAS SALVAS
// ======================================================

function carregarReceitas(): Receita[] {
  try {
    const dadosSalvos = localStorage.getItem(
      CHAVE_RECEITAS
    );

    if (!dadosSalvos) {
      return [];
    }

    const dados: unknown = JSON.parse(dadosSalvos);

    if (!Array.isArray(dados)) {
      console.warn(
        "Os dados salvos das receitas estão em formato inválido."
      );

      return [];
    }

    return dados as Receita[];
  } catch (erro) {
    console.error(
      "Erro ao carregar as receitas salvas:",
      erro
    );

    return [];
  }
}

// ======================================================
// PROVIDER
// ======================================================

export function ReceitasProvider({
  children,
}: {
  children: ReactNode;
}) {
  // Recupera as receitas salvas ao iniciar o sistema.
  const [receitas, setReceitas] = useState<Receita[]>(
    carregarReceitas
  );

  // Salva automaticamente sempre que uma receita
  // for cadastrada ou excluída.
  useEffect(() => {
    try {
      localStorage.setItem(
        CHAVE_RECEITAS,
        JSON.stringify(receitas)
      );
    } catch (erro) {
      console.error(
        "Erro ao salvar as receitas:",
        erro
      );
    }
  }, [receitas]);

  // ====================================================
  // CADASTRAR RECEITA
  // ====================================================

  function adicionarReceita(receita: NovaReceita) {
    setReceitas((anterior) => [
      ...anterior,
      {
        ...receita,
        id: Date.now() + Math.random(),
      },
    ]);
  }

  // ====================================================
  // EXCLUIR RECEITA
  // ====================================================

  function excluirReceita(id: number) {
    setReceitas((anterior) =>
      anterior.filter(
        (receita) => receita.id !== id
      )
    );
  }

  // ====================================================
  // DISPONIBILIZAÇÃO DO CONTEXTO
  // ====================================================

  return (
    <ReceitasContext.Provider
      value={{
        receitas,
        adicionarReceita,
        excluirReceita,
      }}
    >
      {children}
    </ReceitasContext.Provider>
  );
}

// ======================================================
// HOOK
// ======================================================

export function useReceitas() {
  const contexto = useContext(ReceitasContext);

  if (!contexto) {
    throw new Error(
      "useReceitas deve ser utilizado dentro de ReceitasProvider."
    );
  }

  return contexto;
}
