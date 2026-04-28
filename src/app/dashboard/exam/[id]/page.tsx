import ActiveExam from '@/components/student/ActiveExam'

export default async function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ActiveExam apiBaseUrl="/api" examId={id} />
}
