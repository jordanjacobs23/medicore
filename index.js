import ngrok from "@ngrok/ngrok";

async function forwardToApp() {
  const forwarder = await ngrok.forward({
    addr: "localhost:3000",
    authtoken_from_env: true,
    domain: "divisibly-dotted-chaffing.ngrok-free.dev",
  });
  console.log(`Available at: ${forwarder.url()}`);
}

forwardToApp();