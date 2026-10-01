import { useAuth } from "@/_core/hooks/useAuth";
import { STATIC_CATALOG_IMAGES } from "@/data/staticCatalogFallback";
import { trpc } from "@/lib/trpc";
import { ImagePlus, Loader2, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";

const isPrerender = typeof window === "undefined";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type CatalogGalleryProps = {
  compact?: boolean;
};

type CatalogImage = {
  id: number;
  url: string;
  alt: string;
  objectKey: string;
  fileUrl: string;
  contentType: string | null;
  userId: string | null;
  createdAt: Date;
};

const staticCatalogFallback: CatalogImage[] = STATIC_CATALOG_IMAGES.map((image, index) => ({
  id: index + 1,
  url: image.url,
  alt: image.alt,
  objectKey: `static/${image.id}`,
  fileUrl: image.url,
  contentType: "image/webp",
  userId: null,
  createdAt: new Date(0),
}));

export function CatalogGallery({ compact = false }: CatalogGalleryProps) {
  const query = trpc.catalog.list.useQuery(undefined, {
    initialData: isPrerender ? staticCatalogFallback : undefined,
  });
  const images: CatalogImage[] = query.data ?? (isPrerender ? staticCatalogFallback : []);

  return (
    <div className={compact ? "catalog-gallery catalog-gallery-compact" : "catalog-gallery"}>
      {images.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3 lg:gap-8">
          {images.map((image) => (
            <figure key={image.id} className="catalog-image-card">
              <img src={image.url} alt={image.alt} loading="lazy" />
              <figcaption>{image.alt}</figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <div className="catalog-empty">
          <ImagePlus className="h-5 w-5 text-[#D9A83E]" />
          <span>As novas imagens do catálogo aparecerão aqui.</span>
        </div>
      )}
    </div>
  );
}

export function CatalogManager() {
  const { user, loading } = useAuth();
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const upload = trpc.catalog.upload.useMutation({
    onSuccess: async () => {
      setFile(null);
      setAlt("");
      setNotice("Imagem adicionada ao catálogo.");
      if (fileInput.current) fileInput.current.value = "";
      await utils.catalog.list.invalidate();
    },
    onError: (error: { message: string }) =>
      setNotice(
        error.message.includes("bucket") || error.message.includes("Bucket")
          ? "O bucket assets ainda precisa ser criado no Neon Object Storage."
          : "Não foi possível enviar esta imagem. Tente novamente.",
      ),
  });

  if (loading) return null;
  if (!user) return null;
  if (user.role !== "admin") return null;

  const submit = async () => {
    if (!file || !alt.trim()) {
      setNotice("Escolha uma imagem e escreva uma descrição para acessibilidade.");
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setNotice("Use JPG, PNG, WEBP ou GIF.");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setNotice("A imagem deve ter no máximo 6 MB.");
      return;
    }
    const dataBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
      reader.onerror = () => reject(new Error("file-read"));
      reader.readAsDataURL(file);
    });
    setNotice(null);
    upload.mutate({ fileName: file.name, contentType: file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif", dataBase64, alt: alt.trim() });
  };

  return (
    <div className="catalog-manager mt-8">
      <div className="flex items-start gap-3"><UploadCloud className="mt-1 h-5 w-5 text-[#D9A83E]" /><div><p className="font-semibold text-[#5A3428]">Atualizar catálogo</p><p className="mt-1 text-xs leading-5 text-[#8A5A44]">Envie uma imagem de até 6 MB. Ela ficará disponível na galeria pública.</p></div></div>
      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end md:gap-6 lg:gap-8">
        <label className="catalog-upload-field">Imagem<input ref={fileInput} type="file" accept={ACCEPTED_TYPES.join(",")} onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
        <label className="catalog-upload-field">Descrição da imagem<input value={alt} onChange={(event) => setAlt(event.target.value)} placeholder="Ex.: Bolo floral para aniversário" /></label>
        <button type="button" disabled={upload.isPending} onClick={submit} className="button-gold h-12">{upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar imagem"}</button>
      </div>
      {file && <p className="mt-3 text-xs text-[#8A5A44]">Selecionada: {file.name}</p>}
      {notice && <p className="mt-3 text-xs font-semibold text-[#8A5A44]" role="status">{notice}</p>}
    </div>
  );
}
