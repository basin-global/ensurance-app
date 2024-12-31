export default function GroupAccountsPage({
    params,
  }: {
    params: { group: string };
  }) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center gap-4">
        <h2 className="text-xl text-gray-600">
          Group: {params.group}
        </h2>
        <h1 className="text-2xl font-semibold text-gray-700">
          Create an account
        </h1>
      </div>
    );
  } 