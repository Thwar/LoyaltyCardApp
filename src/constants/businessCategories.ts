// Business categories configuration
export const BUSINESS_CATEGORIES = [
  { label: "Postres", value: "postres" },
  { label: "Comida Nacional", value: "comida_nacional" },
  { label: "Carnes", value: "carnes" },
  { label: "Hamburguesas", value: "hamburguesas" },
  { label: "Helados", value: "helados" },
  { label: "Pollo", value: "pollo" },
  { label: "Sushi", value: "sushi" },
  { label: "Comida China", value: "comida_china" },
  { label: "Comida Mexicana", value: "comida_mexicana" },
  { label: "Comida Arabe", value: "comida_arabe" },
  { label: "Sandwiches", value: "sandwiches" },
  { label: "Cafeteria", value: "cafeteria" },
  { label: "Licuados y Jugos", value: "licuados_jugos" },
  { label: "Ensaladas", value: "ensaladas" },
  { label: "Milanesas", value: "milanesas" },
  { label: "Pastas", value: "pastas" },
  { label: "Wraps", value: "wraps" },
  { label: "Acai", value: "acai" },
  { label: "Pizzas", value: "pizzas" },
  { label: "Empanadas", value: "empanadas" },
  { label: "Comida Vegetariana", value: "comida_vegetariana" },
  { label: "Servicios", value: "servicios" },
  { label: "Otros", value: "otros" },
];

// Category value to label mapping for display purposes
export const CATEGORY_LABELS: { [key: string]: string } = {
  postres: "Postres",
  comida_nacional: "Comida Nacional",
  carnes: "Carnes",
  hamburguesas: "Hamburguesas",
  helados: "Helados",
  pollo: "Pollo",
  sushi: "Sushi",
  comida_china: "Comida China",
  comida_mexicana: "Comida Mexicana",
  comida_arabe: "Comida Árabe",
  sandwiches: "Sandwiches",
  cafeteria: "Cafetería",
  licuados_jugos: "Licuados y Jugos",
  ensaladas: "Ensaladas",
  milanesas: "Milanesas",
  pastas: "Pastas",
  wraps: "Wraps",
  acai: "Açaí",
  pizzas: "Pizzas",
  empanadas: "Empanadas",
  comida_vegetariana: "Comida Vegetariana",
  servicios: "Servicios",
  otros: "Otros",
};

// Helper function to get category label by value
export const getCategoryLabel = (categoryValue: string): string => {
  return CATEGORY_LABELS[categoryValue] || categoryValue;
};
