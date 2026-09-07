// Variante visuelle active (dev preview uniquement) :
//   B = Direction B « Officier sur crème »  (panneau kaki avec textes blancs)
//   C = Direction C « Camouflage discret »  (crème + galon kaki + textes olive)
// La valeur par défaut est "C".
export const VARIANT: "B" | "C" =
  (process.env.NEXT_PUBLIC_VARIANT as "B" | "C" | undefined) === "B" ? "B" : "C"
