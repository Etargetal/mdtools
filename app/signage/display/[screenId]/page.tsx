interface DisplayPageProps {
  params: Promise<{
    screenId: string;
  }>;
}

export default async function DisplayPage({ params }: DisplayPageProps) {
  const { screenId } = await params;

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Display Screen</h1>
        <p className="text-xl text-gray-400">Screen ID: {screenId}</p>
        <p className="text-gray-500 mt-4">Display content coming soon...</p>
      </div>
    </div>
  );
}

