
import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

// Chave utilizada para salvar os registros
// de frequência no navegador.
const CHAVE_FREQUENCIA = "cape_gestao_frequencia_v1";

export type RegistroFrequencia = {
  estudanteId: number;
  data: string;
  entradaReal: string | null;
  saidaReal: string | null;
};

type FrequenciaContextType = {
  registros: RegistroFrequencia[];

  registrarEntrada: (
    estudanteId: number,
    data: string,
    horario: string
  ) => void;

  registrarSaida: (
    estudanteId: number,
    data: string,
    horario: string
  ) => void;
};

const FrequenciaContext = createContext<
  FrequenciaContextType | undefined
>(undefined);

// Recupera os registros anteriormente salvos.
function carregarFrequencia(): RegistroFrequencia[] {
  try {
    const dadosSalvos = localStorage.getItem(
      CHAVE_FREQUENCIA
    );

    if (!dadosSalvos) {
      return [];
    }

    const dados = JSON.parse(dadosSalvos);

    if (!Array.isArray(dados)) {
      console.warn(
        "Os registros de frequência salvos estão em formato inválido."
      );

      return [];
    }

    return dados as RegistroFrequencia[];
  } catch (erro) {
    console.error(
      "Erro ao carregar os registros de frequência:",
      erro
    );

    return [];
  }
}

export function FrequenciaProvider({
  children,
}: {
  children: ReactNode;
}) {
  // Recupera os registros salvos ao iniciar.
  const [registros, setRegistros] = useState<
    RegistroFrequencia[]
  >(carregarFrequencia);

  // Salva automaticamente sempre que os
  // registros de frequência forem alterados.
  useEffect(() => {
    try {
      localStorage.setItem(
        CHAVE_FREQUENCIA,
        JSON.stringify(registros)
      );
    } catch (erro) {
      console.error(
        "Erro ao salvar os registros de frequência:",
        erro
      );
    }
  }, [registros]);

  function registrarEntrada(
    estudanteId: number,
    data: string,
    horario: string
  ) {
    setRegistros((lista) => {
      // Impede duplicidade de entrada
      // para o mesmo estudante e data.
      const existente = lista.find(
        (item) =>
          item.estudanteId === estudanteId &&
          item.data === data
      );

      if (existente) {
        return lista;
      }

      return [
        ...lista,
        {
          estudanteId,
          data,
          entradaReal: horario,
          saidaReal: null,
        },
      ];
    });
  }

  function registrarSaida(
    estudanteId: number,
    data: string,
    horario: string
  ) {
    setRegistros((lista) =>
      lista.map((item) =>
        item.estudanteId === estudanteId &&
        item.data === data &&
        item.entradaReal !== null &&
        item.saidaReal === null
          ? {
              ...item,
              saidaReal: horario,
            }
          : item
      )
    );
  }

  return (
    <FrequenciaContext.Provider
      value={{
        registros,
        registrarEntrada,
        registrarSaida,
      }}
    >
      {children}
    </FrequenciaContext.Provider>
  );
}

export function useFrequencia() {
  const contexto = useContext(FrequenciaContext);

  if (!contexto) {
    throw new Error(
      "useFrequencia deve ser utilizado dentro de FrequenciaProvider."
    );
  }

  return contexto;
}
