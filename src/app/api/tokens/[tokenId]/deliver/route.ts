// Alias route to maintain backward compatibility with older clients
// Delegates to the canonical singular endpoint: /api/token/[tokenId]/deliver
export { POST } from "@/app/api/token/[tokenId]/deliver/route";
