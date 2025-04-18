export default function BinderPage() {
  return (
    <div className="flex flex-col items-center justify-start pt-20 pb-20 p-4 text-center">
      <h1 className="text-2xl font-bold mb-4">Binder Updates Coming Soon</h1>
      <p className="mb-4">The binder functionality is currently available at</p>
      <a 
        href="https://binder.ensurance.app" 
        className="text-blue-500 hover:text-blue-700 underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        binder.ensurance.app
      </a>
      <p className="mt-4">Check back here for updates!</p>
    </div>
  );
}