export default function Auth() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-xl font-semibold tracking-tight text-white">
            Authenticate
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Enter your credentials to access the policy verification system.
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-zinc-300 uppercase">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="mt-1 block w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 sm:text-sm transition-all"
              placeholder="name@example.com"
            />
          </div>

          <button className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-black bg-white hover:bg-zinc-200 focus:outline-none transition-colors">
            Sign In
          </button>
          
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-zinc-950 text-zinc-500 uppercase">Or continue with</span>
            </div>
          </div>

          <button className="w-full flex justify-center py-2 px-4 border border-zinc-800 rounded-md shadow-sm text-sm font-medium text-zinc-300 bg-zinc-900 hover:bg-zinc-800 transition-colors">
            Digital ID (SSO)
          </button>
        </div>
      </div>
    </div>
  );
}