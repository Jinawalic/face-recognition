import ExamSuccess from '@/components/student/ExamSuccess'

export default async function SuccessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ExamSuccess examId={id} />
}
