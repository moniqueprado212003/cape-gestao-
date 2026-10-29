
export type RestricaoAlimentar =
  | "sim"
  | "nao"
  | "nao_informado";

export type Estudante = {
  id: number;
  nome: string;
  dias: string[];
  entrada: string;
  saida: string;
  restricao: RestricaoAlimentar;
  tipoRestricao: string;
  alimentosEvitar: string;
  orientacoes: string;
  ativo: boolean;
};
