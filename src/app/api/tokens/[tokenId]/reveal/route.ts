// Alias route to maintain backward compatibility with older clients
// Delegates to the canonical singular endpoint: /api/token/[tokenId]/reveal
export { POST } from "@/app/api/token/[tokenId]/reveal/route";
