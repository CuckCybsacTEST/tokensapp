import { buildTitle } from '@/lib/seo/title';
export async function generateMetadata({ params }: { params: { sessionId: string } }) {
	return { title: buildTitle(['Ruleta', '#' + params.sessionId]) };
}

// Deprecated placeholder page — keep a proper default export named `Page` so Next's
// type generation and checks treat this as a module.
export default function Page(): JSX.Element {
	return <></>;
}
