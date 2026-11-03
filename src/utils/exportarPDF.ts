
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type ValorCelula = string | number;

type DadosPDF = {
  titulo: string;
  nomeArquivo: string;
  colunas: string[];
  linhas: ValorCelula[][];
  periodo?: string;
  observacao?: string;
};

export function exportarPDF({
  titulo,
  nomeArquivo,
  colunas,
  linhas,
  periodo,
  observacao,
}: DadosPDF) {
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const largura = pdf.internal.pageSize.getWidth();
  const altura = pdf.internal.pageSize.getHeight();

  // Cabeçalho institucional
  pdf.setFillColor(19, 78, 74);
  pdf.rect(0, 0, largura, 32, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(17);
  pdf.text("CAPE", 14, 14);

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text("Sistema de Gestão de Alimentação", 14, 22);

  pdf.setTextColor(35, 50, 65);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(15);
  pdf.text(titulo, 14, 43);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);

  const emissao = new Date().toLocaleString("pt-BR");

  pdf.text(`Emitido em: ${emissao}`, 14, 51);

  if (periodo) {
    pdf.text(`Período: ${periodo}`, 14, 57);
  }

  const inicioTabela = periodo ? 65 : 59;

  autoTable(pdf, {
    head: [colunas],
    body:
      linhas.length > 0
        ? linhas.map((linha) => linha.map(String))
        : [
            [
              "Nenhum registro encontrado",
              ...colunas.slice(1).map(() => ""),
            ],
          ],
    startY: inicioTabela,
    theme: "grid",
    margin: {
      left: 14,
      right: 14,
      bottom: 22,
    },
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 3,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [19, 78, 74],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [245, 249, 248],
    },
  });

  if (observacao) {
    const posicaoTabela = (
      pdf as jsPDF & {
        lastAutoTable?: { finalY: number };
      }
    ).lastAutoTable?.finalY ?? inicioTabela;

    const linhasObservacao = pdf.splitTextToSize(
      observacao,
      largura - 28
    ) as string[];

    const alturaObservacao = linhasObservacao.length * 4 + 8;
    let posicaoObservacao = posicaoTabela + 9;

    if (posicaoObservacao + alturaObservacao > altura - 18) {
      pdf.addPage();
      posicaoObservacao = 20;
    }

    pdf.setFontSize(9);
    pdf.setTextColor(85, 95, 105);
    pdf.text(linhasObservacao, 14, posicaoObservacao);
  }

  // Numeração e rodapé em todas as páginas
  const totalPaginas = pdf.getNumberOfPages();

  for (let pagina = 1; pagina <= totalPaginas; pagina++) {
    pdf.setPage(pagina);
    pdf.setDrawColor(220, 225, 230);
    pdf.line(14, altura - 15, largura - 14, altura - 15);

    pdf.setFontSize(8);
    pdf.setTextColor(110, 120, 130);
    pdf.text(
      "CAPE | Relatório gerado pelo sistema",
      14,
      altura - 10
    );

    pdf.text(
      `Página ${pagina} de ${totalPaginas}`,
      largura - 14,
      altura - 10,
      { align: "right" }
    );
  }

  pdf.save(nomeArquivo);
}
