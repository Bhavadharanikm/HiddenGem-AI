import ChatInterface from "@/components/chat/ChatInterface";

// Mock data — replace with Supabase queries once auth is wired up
const MOCK_CLIENTS = [
  { id: "1", name: "Paradise Point", slug: "paradise-point" },
  { id: "2", name: "Reflections Resorts", slug: "reflections-resorts" },
  { id: "3", name: "The Cohost Company", slug: "the-cohost-company" },
];

const MOCK_CONVERSATIONS = [
  {
    id: "c1",
    title: "Q3 occupancy analysis",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "c2",
    title: "Meta campaign performance review",
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "c3",
    title: "Audience targeting strategy",
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "c4",
    title: "Review response templates",
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: "c5",
    title: "Seasonal pricing strategy",
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
];

export default function Home() {
  return (
    <ChatInterface
      initialClients={MOCK_CLIENTS}
      initialConversations={MOCK_CONVERSATIONS}
    />
  );
}
