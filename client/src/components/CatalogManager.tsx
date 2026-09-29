import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { ImagePlus, Loader2, LockKeyhole, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type CatalogGalleryProps = {
  compact?: boolean;
};

export function CatalogGallery({ compact = false }: CatalogGalleryProps) {
  const query = trpc.catalog.list.useQuery();
  const images = query.data ?? [];

  return (
    <div className={compact ? "catalog-gallery catalog-gallery-compact" : "catalog-gallery"}>
      {images.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
  const { user, loading, loginWithPassword } = useAuth();
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState("");
  const [password, setPassword] = useState("");
  const [loginPending, setLoginPending] = useState(false);
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
    onError: (error) => setNotice(error.message.includes("bucket") || error.message.includes("Bucket")
      ? "O bucket assets ainda precisa ser criado no Neon Object Storage."
      : "Não foi possível enviar esta imagem. Tente novamente."),
  });

  if (loading) return null;
  if (!user) {
    const submitLogin = async () => {
      setLoginPending(true);
      setNotice(null);
      const result = await loginWithPassword(password);
      setLoginPending(false);
      if (!result.ok) {
        setNotice(result.error);
      } else {
        setPassword("");
      }
    };

    return (
      <div className="catalog-access-card">
        <LockKeyhole className="h-5 w-5 text-[#D9A83E]" />
        <div>
          <p className="font-semibold text-[#5A3428]">Área de atualização do catálogo</p>
          <p className="mt-1 text-xs text-[#8A5A44]">Acesso restrito à responsável pela Chocolícia.</p>
        </div>
        <label className="catalog-upload-field ml-auto min-w-[12rem]">
          Senha de administração
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void submitLogin();
            }}
          />
        </label>
        <button type="button" disabled={loginPending || !password} onClick={() => void submitLogin()} className="button-outline">
          {loginPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
        </button>
        {notice && (
          <p className="w-full text-xs font-semibold text-[#8A5A44]" role="status">
            {notice}
          </p>
        )}
      </div>
    );
  }
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
    <div className="catalog-manager">
      <div className="flex items-start gap-3"><UploadCloud className="mt-1 h-5 w-5 text-[#D9A83E]" /><div><p className="font-semibold text-[#5A3428]">Atualizar catálogo</p><p className="mt-1 text-xs leading-5 text-[#8A5A44]">Envie uma imagem de até 6 MB. Ela ficará disponível na galeria pública.</p></div></div>
      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <label className="catalog-upload-field">Imagem<input ref={fileInput} type="file" accept={ACCEPTED_TYPES.join(",")} onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
        <label className="catalog-upload-field">Descrição da imagem<input value={alt} onChange={(event) => setAlt(event.target.value)} placeholder="Ex.: Bolo floral para aniversário" /></label>
        <button type="button" disabled={upload.isPending} onClick={submit} className="button-gold h-12">{upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar imagem"}</button>
      </div>
      {file && <p className="mt-3 text-xs text-[#8A5A44]">Selecionada: {file.name}</p>}
      {notice && <p className="mt-3 text-xs font-semibold text-[#8A5A44]" role="status">{notice}</p>}
    </div>
  );
}
