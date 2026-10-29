
import { useState } from "react";
import { CalendarDays } from "lucide-react";

type DataBrasileiraProps = {
  id: string;
  value: string;
  onChange: (data: string) => void;
};

function formatarData(data: string): string {
  const partes = data.split("-");

  if (partes.length !== 3) return "";

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function converterParaISO(data: string): string | null {
  const resultado = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(data);

  if (!resultado) return null;

  const dia = Number(resultado[1]);
  const mes = Number(resultado[2]);
  const ano = Number(resultado[3]);

  const dataValidada = new Date(ano, mes - 1, dia);

  if (
    dataValidada.getFullYear() !== ano ||
    dataValidada.getMonth() !== mes - 1 ||
    dataValidada.getDate() !== dia
  ) {
    return null;
  }

  return [
    String(ano).padStart(4, "0"),
    String(mes).padStart(2, "0"),
    String(dia).padStart(2, "0"),
  ].join("-");
}

export default function DataBrasileira({
  id,
  value,
  onChange,
}: DataBrasileiraProps) {
  const [texto, setTexto] = useState<string | null>(null);

  const valorExibido = texto ?? formatarData(value);

  const dataValida =
    texto === null ||
    converterParaISO(texto) !== null;

  function atualizarTexto(novoTexto: string) {
    const numeros = novoTexto.replace(/\D/g, "").slice(0, 8);

    let formatado = numeros;

    if (numeros.length > 2) {
      formatado =
        numeros.slice(0, 2) + "/" + numeros.slice(2);
    }

    if (numeros.length > 4) {
      formatado =
        numeros.slice(0, 2) +
        "/" +
        numeros.slice(2, 4) +
        "/" +
        numeros.slice(4);
    }

    setTexto(formatado);

    const dataISO = converterParaISO(formatado);

    if (dataISO) {
      onChange(dataISO);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        placeholder="DD/MM/AAAA"
        value={valorExibido}
        onChange={(evento) =>
          atualizarTexto(evento.target.value)
        }
        onBlur={() => {
          if (!converterParaISO(valorExibido)) {
            setTexto(null);
          } else {
            setTexto(null);
          }
        }}
        aria-invalid={!dataValida}
        className={`border rounded-xl p-3 w-36 ${
          dataValida
            ? "border-slate-300"
            : "border-red-400"
        }`}
      />

      <div className="relative">
        <CalendarDays
          size={20}
          className="text-teal-700 pointer-events-none"
        />

        <input
          type="date"
          value={value}
          onChange={(evento) => {
            if (evento.target.value) {
              onChange(evento.target.value);
              setTexto(null);
            }
          }}
          aria-label="Selecionar data no calendário"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
}
