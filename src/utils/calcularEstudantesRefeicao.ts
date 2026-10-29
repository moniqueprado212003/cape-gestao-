import type { Estudante } from "../types/Estudante";
import type { RegistroFrequencia } from "../context/FrequenciaContext";

export type ModoContagem = "previstos" | "confirmados";

type ParametrosCalculo = {
  estudantes: Estudante[];
  registros: RegistroFrequencia[];
  data: string;
  horarioRefeicao: string;
  modo: ModoContagem;
};

function minutos(horario: string): number | null {
  const partes = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(horario);
  return partes ? Number(partes[1]) * 60 + Number(partes[2]) : null;
}

function diaSemana(data: string): string | null {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
  if (!partes) return null;
  const ano = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  const dataUTC = new Date(Date.UTC(ano, mes - 1, dia));
  if (dataUTC.getUTCFullYear() !== ano || dataUTC.getUTCMonth() !== mes - 1 || dataUTC.getUTCDate() !== dia) return null;
  return ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"][dataUTC.getUTCDay()];
}

function dataLocal(agora: Date): string {
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;
}

export function calcularEstudantesRefeicao({
  estudantes,
  registros,
  data,
  horarioRefeicao,
  modo,
}: ParametrosCalculo): number {
  const dia = diaSemana(data);
  const horario = minutos(horarioRefeicao);
  if (!dia || horario === null) return 0;

  const agora = new Date();
  const hoje = dataLocal(agora);
  const horarioAtual = agora.getHours() * 60 + agora.getMinutes();

  return estudantes.filter((estudante) => {
    if (!estudante.ativo) return false;

    if (modo === "previstos") {
      const entrada = minutos(estudante.entrada);
      const saida = minutos(estudante.saida);
      return (
        estudante.dias.includes(dia) &&
        entrada !== null &&
        saida !== null &&
        entrada <= horario &&
        horario < saida
      );
    }

    const registro = registros.find(
      (item) => item.estudanteId === estudante.id && item.data === data
    );
    if (!registro?.entradaReal) return false;
    const entradaReal = minutos(registro.entradaReal);
    if (entradaReal === null || entradaReal > horario) return false;

    if (registro.saidaReal !== null) {
      const saidaReal = minutos(registro.saidaReal);
      return saidaReal !== null && horario < saidaReal;
    }

    // Sem saída registrada, só confirmamos o horário de refeição
    // quando ele já ocorreu hoje. Registros antigos incompletos
    // não comprovam permanência na refeição.
    return data === hoje && horario <= horarioAtual;
  }).length;
}
