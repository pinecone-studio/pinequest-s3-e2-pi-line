import { notFound } from "next/navigation";
import { getQuestionPageData } from "@/lib/question/actions";
import AddQuestionForm from "./_features/AddQuestionForm";
import QuestionListPanel from "./_features/QuestionListPanel";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ExamQuestionsPage({ params }: Props) {
  const { id } = await params;
  const data = await getQuestionPageData(id);
  if (!data) notFound();
  const { exam, questions, passages } = data;

  return (
    <div className=" space-y-8 px-2 md:px-4">
      <div className="flex flex-col gap-6">
        <QuestionListPanel
          questions={questions}
          examId={id}
          passages={passages}
          syncTargetId="question-editor-panel"
          isLocked={Boolean(exam.is_published)}
        />
        <div id="question-editor-panel">
          {exam.is_published ? (
            <div className="rounded-[28px] border border-dashed border-zinc-200 bg-white p-8 text-sm text-zinc-500 shadow-[0_12px_40px_-18px_rgba(15,23,42,0.16)]">
              Энэ шалгалт нийтлэгдсэн тул шинээр асуулт нэмэх боломжгүй.
            </div>
          ) : (
            <AddQuestionForm examId={id} passages={passages} />
          )}
        </div>

      
      </div>
    </div>
  );
}
