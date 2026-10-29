
import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

import type { Estudante } from "../types/Estudante";

// Chave utilizada para identificar os dados
// no armazenamento local do navegador.
const CHAVE_ESTUDANTES = "cape_gestao_estudantes_v1";

type EstudantesContextType = {
  estudantes: Estudante[];
  adicionarEstudante: (estudante: Estudante) => void;
  atualizarEstudante: (estudante: Estudante) => void;
  alterarSituacao: (id: number) => void;
  importarEstudantes: (novos: Estudante[]) => void;
};

const EstudantesContext = createContext<
  EstudantesContextType | undefined
>(undefined);

// Recupera os estudantes anteriormente salvos.
function carregarEstudantes(): Estudante[] {
  try {
    const dadosSalvos = localStorage.getItem(
      CHAVE_ESTUDANTES
    );

    if (!dadosSalvos) {
      return [];
    }

    const dados = JSON.parse(dadosSalvos);

    if (!Array.isArray(dados)) {
      console.warn(
        "Os dados salvos de estudantes estão em formato inválido."
      );
      return [];
    }

    return dados as Estudante[];
  } catch (erro) {
    console.error(
      "Erro ao carregar os estudantes salvos:",
      erro
    );

    return [];
  }
}

export function EstudantesProvider({
  children,
}: {
  children: ReactNode;
}) {
  // Inicializa o estado com os estudantes
  // recuperados do armazenamento local.
  const [estudantes, setEstudantes] = useState<Estudante[]>(
    carregarEstudantes
  );

  // Salva automaticamente quando a lista mudar.
  useEffect(() => {
    try {
      localStorage.setItem(
        CHAVE_ESTUDANTES,
        JSON.stringify(estudantes)
      );
    } catch (erro) {
      console.error(
        "Erro ao salvar os estudantes:",
        erro
      );
    }
  }, [estudantes]);

  function adicionarEstudante(estudante: Estudante) {
    setEstudantes((lista) => [
      ...lista,
      estudante,
    ]);
  }

  function atualizarEstudante(estudante: Estudante) {
    setEstudantes((lista) =>
      lista.map((item) =>
        item.id === estudante.id
          ? estudante
          : item
      )
    );
  }

  function alterarSituacao(id: number) {
    setEstudantes((lista) =>
      lista.map((item) =>
        item.id === id
          ? {
              ...item,
              ativo: !item.ativo,
            }
          : item
      )
    );
  }

  function importarEstudantes(novos: Estudante[]) {
    setEstudantes((lista) => {
      const ids = new Set(
        lista.map((item) => item.id)
      );

      const nomes = new Set(
        lista.map((item) =>
          item.nome
            .trim()
            .toLocaleLowerCase("pt-BR")
        )
      );

      const aceitos: Estudante[] = [];

      for (const estudante of novos) {
        const nome = estudante.nome
          .trim()
          .toLocaleLowerCase("pt-BR");

        if (nomes.has(nome)) {
          continue;
        }

        let id = estudante.id;

        while (ids.has(id)) {
          id += 1;
        }

        ids.add(id);
        nomes.add(nome);

        aceitos.push({
          ...estudante,
          id,
        });
      }

      return [
        ...lista,
        ...aceitos,
      ];
    });
  }

  return (
    <EstudantesContext.Provider
      value={{
        estudantes,
        adicionarEstudante,
        atualizarEstudante,
        alterarSituacao,
        importarEstudantes,
      }}
    >
      {children}
    </EstudantesContext.Provider>
  );
}

export function useEstudantes() {
  const contexto = useContext(EstudantesContext);

  if (!contexto) {
    throw new Error(
      "useEstudantes deve ser utilizado dentro de EstudantesProvider."
    );
  }

  return contexto;
}
