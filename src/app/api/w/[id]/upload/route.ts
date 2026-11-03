import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { db } from '@/db/client';
import { uploads, UPLOAD_KINDS } from '@/db/schema';
import { requireMember, ForbiddenError } from '@/lib/workshops/access';
import { UnauthenticatedError } from '@/lib/auth/current-user';

export const runtime = 'nodejs';

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

/**
 * Image upload for sketches and photos. Goes to Vercel Blob when
 * BLOB_READ_WRITE_TOKEN is set; without it (local dev) the image comes
 * back as a data URL so the flow still works.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { user } = await requireMember(id);
    const form = await req.formData();
    const file = form.get('file');
    const kind = String(form.get('kind') ?? 'sketch');
    if (!(file instanceof File)) return NextResponse.json({ error: 'No file' }, { status: 400 });
    if (!ALLOWED.has(file.type)) return NextResponse.json({ error: 'Use a PNG, JPEG, WebP or GIF' }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Keep images under 8 MB' }, { status: 400 });
    if (!(UPLOAD_KINDS as readonly string[]).includes(kind)) return NextResponse.json({ error: 'Bad kind' }, { status: 400 });

    const bytes = Buffer.from(await file.arrayBuffer());
    let url: string;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
      const blob = await put(`w/${id}/${kind}-${Date.now()}.${ext}`, bytes, { access: 'public', addRandomSuffix: true, contentType: file.type });
      url = blob.url;
    } else {
      url = `data:${file.type};base64,${bytes.toString('base64')}`;
    }

    const [row] = await db
      .insert(uploads)
      .values({ workshopId: id, userId: user.id, kind: kind as (typeof UPLOAD_KINDS)[number], url, contentType: file.type, sizeBytes: file.size })
      .returning({ id: uploads.id });

    return NextResponse.json({ url, uploadId: row.id, stored: !!process.env.BLOB_READ_WRITE_TOKEN });
  } catch (err) {
    if (err instanceof UnauthenticatedError) return NextResponse.json({ error: 'Sign in' }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    console.error('[upload]', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
