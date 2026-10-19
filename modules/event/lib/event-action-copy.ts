export type ConfirmableAction = "cancel" | "delete" | "suspend";

const number = new Intl.NumberFormat("es-PE");

/** AC19/AC26: textos de confirmación. Con ventas se dice explícitamente que no hay reembolso ni aviso automático. */
export function getActionCopy(action: ConfirmableAction, ctx: { title: string; sold: number }): { title: string; description: string; confirm: string } {
  const sales =
    ctx.sold > 0
      ? `Ya se vendieron ${number.format(ctx.sold)} entradas: no se reembolsan ni se avisa a los compradores automáticamente; los reembolsos los gestiona un administrador. `
      : "";
  switch (action) {
    case "cancel":
      return {
        title: `¿Cancelar «${ctx.title}»?`,
        description: `${sales}El evento deja de venderse y no se puede volver a publicar.`,
        confirm: "Cancelar evento",
      };
    case "delete":
      return {
        title: `¿Eliminar «${ctx.title}»?`,
        description: "Se borra definitivamente junto con sus tipos de entrada. Esta acción no se puede deshacer.",
        confirm: "Eliminar",
      };
    case "suspend":
      return {
        title: `¿Suspender «${ctx.title}»?`,
        description: `${sales}Deja de venderse y su organizador no podrá editarlo hasta que lo reactives.`,
        confirm: "Suspender",
      };
  }
}
