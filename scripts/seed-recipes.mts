import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { getDb } from "../server/db";
import { recipes } from "../drizzle/schema";

const examples = [
  {
    slug: "bolo-de-chocolate-fofinho", title: "Bolo de chocolate fofinho", excerpt: "Massa macia, chocolate intenso e cobertura cremosa para um café da tarde cheio de carinho.", category: "Bolos", tags: ["chocolate", "bolo", "lanche"], image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1280&q=85", alt: "Bolo de chocolate com cobertura cremosa e raspas", prep: 25, cook: 35, servings: 10, difficulty: "Fácil",
  },
  {
    slug: "brigadeiro-cremoso-de-panela", title: "Brigadeiro cremoso de panela", excerpt: "O clássico brigadeiro no ponto de colher, com textura aveludada e sabor de infância.", category: "Brigadeiros e docinhos", tags: ["brigadeiro", "chocolate", "docinho"], image: "https://images.unsplash.com/photo-1582176604856-e824b4736522?auto=format&fit=crop&w=1280&q=85", alt: "Brigadeiros artesanais decorados com chocolate", prep: 5, cook: 15, servings: 8, difficulty: "Fácil",
  },
  {
    slug: "torta-de-limao-com-merengue", title: "Torta de limão com merengue", excerpt: "Base crocante, recheio cítrico e uma camada delicada de merengue dourado.", category: "Tortas", tags: ["limão", "torta", "merengue"], image: "https://images.unsplash.com/photo-1519915028121-7d3463d20b13?auto=format&fit=crop&w=1280&q=85", alt: "Fatia de torta com creme claro e cobertura dourada", prep: 35, cook: 20, servings: 8, difficulty: "Média",
  },
  {
    slug: "mousse-de-maracuja", title: "Mousse de maracujá delicada", excerpt: "Uma sobremesa leve e cremosa, finalizada com calda brilhante de maracujá.", category: "Sobremesas", tags: ["maracujá", "mousse", "sobremesa"], image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=1280&q=85", alt: "Sobremesa cremosa servida em taça com fruta", prep: 20, cook: 0, servings: 6, difficulty: "Fácil",
  },
  {
    slug: "trufas-de-chocolate-artesanais", title: "Trufas de chocolate artesanais", excerpt: "Pequenas trufas com casquinha delicada e recheio macio para presentear ou celebrar.", category: "Chocolates", tags: ["trufa", "chocolate", "presente"], image: "https://images.unsplash.com/photo-1548907040-4d42bfc64d9b?auto=format&fit=crop&w=1280&q=85", alt: "Trufas de chocolate artesanais em composição rústica", prep: 40, cook: 10, servings: 20, difficulty: "Média",
  },
  {
    slug: "brigadeiro-de-festa", title: "Brigadeiro de festa tradicional", excerpt: "Docinhos enrolados com cuidado, cobertos de granulado e prontos para a mesa da festa.", category: "Festas e buffet", tags: ["festa", "brigadeiro", "docinhos"], image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=1280&q=85", alt: "Docinhos de chocolate preparados para uma comemoração", prep: 25, cook: 15, servings: 30, difficulty: "Fácil",
  },
] as const;

const ingredientSections = [{ name: "Ingredientes", items: [{ quantity: "2", unit: "xícaras", name: "ingredientes principais" }, { quantity: "1", unit: "colher", name: "manteiga" }] }];
const steps = [{ title: "Prepare", instruction: "Separe os ingredientes e misture até obter uma massa homogênea." }, { title: "Finalize", instruction: "Cozinhe ou leve ao forno até atingir o ponto indicado e sirva depois de esfriar." }];

async function seed() {
  const db = await getDb();
  if (!db) throw new Error("Configure DATABASE_URL ou NEON_DATABASE_URL antes do seed.");
  for (const item of examples) {
    const exists = await db.select({ id: recipes.id }).from(recipes).where(eq(recipes.slug, item.slug)).limit(1);
    if (exists.length) continue;
    await db.insert(recipes).values({
      slug: item.slug, title: item.title, excerpt: item.excerpt, category: item.category,
      tags: [...item.tags], coverImageUrl: item.image, coverImageAlt: item.alt, imagePrompt: "Placeholder remoto para validar o cartão.",
      coverImageVariants: { w480: item.image, w800: item.image, w1280: item.image },
      ingredients: ingredientSections, steps, tips: ["Use ingredientes em temperatura ambiente para um resultado mais uniforme."],
      storageNotes: "Conserve em recipiente fechado e refrigerado por até três dias.", faq: [{ question: "Posso preparar antes?", answer: "Sim. Prepare com antecedência e conserve bem fechado." }],
      prepTimeMin: item.prep, cookTimeMin: item.cook, servings: item.servings, difficulty: item.difficulty,
      status: "published", publishedAt: new Date(Date.now() - examples.indexOf(item) * 60 * 60 * 1000), aiModel: null,
      generationMeta: { source: "seed", isPlaceholder: true },
    });
    console.log(`Seeded: ${item.slug}`);
  }
}

seed().catch((error) => { console.error(error); process.exitCode = 1; });
