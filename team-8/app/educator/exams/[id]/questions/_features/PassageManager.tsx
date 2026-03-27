"use client";

import { useState } from "react";
import {
  addQuestionPassage,
  deleteQuestionPassage,
} from "@/lib/question/actions";
import type { QuestionPassage } from "@/types";
import MathContent from "@/components/math/MathContent";
import LatexShortcutPanel from "@/components/math/LatexShortcutPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import EditPassageDialog from "./EditPassageDialog";

interface PassageManagerProps {
  examId: string;
  passages: QuestionPassage[];
}

export default function PassageManager({
  examId,
  passages,
}: PassageManagerProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isFormulaToolOpen, setIsFormulaToolOpen] = useState(false);
  const [activeFormulaTarget, setActiveFormulaTarget] = useState({
    id: "passage_content",
    label: "Эх материалын текст",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    const result = await addQuestionPassage(examId, formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setTitle("");
    setContent("");
    setContentHtml("");
    setImageUrl("");
    setIsFormulaToolOpen(false);
    setLoading(false);
  }

  async function handleDelete(passageId: string) {
    setRemovingId(passageId);
    setError(null);
    const result = await deleteQuestionPassage(examId, passageId);
    if (result?.error) {
      setError(result.error);
    }
    setRemovingId(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Нийтлэг өгөгдөл / эх материал</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Нэг зураг, хүснэгт, унших эх зэргийг олон асуултад хамтад нь ашиглах бол энд нэмнэ.
        </p>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <form id="passage-form" action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="passage_title">Гарчиг</Label>
            <Input
              id="passage_title"
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Жишээ: Унших эх 1"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="passage_content">Эх материалын текст</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsFormulaToolOpen((prev) => !prev)}
              >
                Томьёоны самбар
                <span className="ml-2 text-xs text-muted-foreground">
                  {isFormulaToolOpen ? "Хаах" : "Нээх"}
                </span>
              </Button>
            </div>
            <Textarea
              id="passage_content"
              name="content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              onFocus={() =>
                setActiveFormulaTarget({
                  id: "passage_content",
                  label: "Эх материалын текст",
                })
              }
              placeholder="Нийтлэг эх, тайлбар, бодлогын нөхцөл эсвэл өгөгдлөө бичнэ..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="passage_image_url">Зургийн URL</Label>
            <Input
              id="passage_image_url"
              name="image_url"
              type="url"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="https://example.com/passage-image.png"
            />
            <p className="text-xs text-muted-foreground">
              Зөвхөн зурагтай материал үүсгэж болно. Хэрэв тайлбар хэрэгтэй бол текст эсвэл HTML нэмнэ.
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
            onClick={() => setShowAdvanced((prev) => !prev)}
          >
            {showAdvanced ? "HTML хаах ✕" : "HTML / хүснэгт нэмэх"}
          </Button>

          {showAdvanced && (
            <div className="space-y-2">
              <Label htmlFor="passage_content_html">
                HTML контент
              </Label>
              <Textarea
                id="passage_content_html"
                name="content_html"
                value={contentHtml}
                onChange={(event) => setContentHtml(event.target.value)}
                onFocus={() =>
                  setActiveFormulaTarget({
                    id: "passage_content_html",
                    label: "HTML контент",
                  })
                }
                placeholder="<table>...</table> эсвэл форматтай контент"
                rows={3}
              />
            </div>
          )}

          {!showAdvanced && (
            <input type="hidden" name="content_html" value={contentHtml} />
          )}

          {isFormulaToolOpen && (
            <LatexShortcutPanel
              targetId={activeFormulaTarget.id}
              targetLabel={activeFormulaTarget.label}
              title="Эх материалын томьёоны самбар"
              description="Текст эсвэл HTML талбар дээр дарж байгаад томьёо, тэмдэгтээ оруулна."
            />
          )}

          {(content.trim() || contentHtml.trim() || imageUrl.trim()) && (
            <div className="space-y-3 rounded-xl border bg-muted/10 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Урьдчилан харах</p>
                <p className="text-xs text-muted-foreground">
                  Сурагчид энэ өгөгдөл дээрээс олон асуулт авна
                </p>
              </div>
              {title.trim() && <p className="font-medium">{title.trim()}</p>}
              <MathContent
                html={contentHtml || null}
                text={content || null}
                className="prose prose-sm max-w-none text-foreground"
              />
              {imageUrl.trim() && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt="Эх материалын зураг"
                  className="max-h-64 rounded-lg border"
                />
              )}
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Нэмж байна..." : "Эх материал нэмэх"}
          </Button>
        </form>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Үүсгэсэн эх материалууд</h3>
            <Badge variant="outline">{passages.length}</Badge>
          </div>

          {passages.length === 0 ? (
            <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
              Одоогоор эх материал үүсгээгүй байна.
            </div>
          ) : (
            passages.map((passage, index) => (
              <div key={passage.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Материал {index + 1}</Badge>
                      {passage.title && (
                        <span className="font-medium">{passage.title}</span>
                      )}
                    </div>
                    <MathContent
                      html={passage.content_html}
                      text={passage.content}
                      className="prose prose-sm line-clamp-4 max-w-none text-foreground"
                    />
                    {passage.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={passage.image_url}
                        alt="Эх материалын зураг"
                        className="max-h-48 rounded-lg border"
                      />
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <EditPassageDialog examId={examId} passage={passage} />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(passage.id)}
                      disabled={removingId === passage.id}
                    >
                      {removingId === passage.id ? "..." : "Устгах"}
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
