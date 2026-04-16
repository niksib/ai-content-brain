export interface StatusVisual {
  label: string;
  bg: string;
  color: string;
}

const STATUS_VISUALS: Record<string, StatusVisual> = {
  // Idea lifecycle
  proposed:  { label: 'Proposed',     bg: '#ffdbcc', color: '#7b2f00' }, // orange
  approved:  { label: 'Approved',     bg: '#e2dfff', color: '#3323cc' }, // lavender
  producing: { label: 'Producing',    bg: '#dbeafe', color: '#1e40af' }, // blue
  rejected:  { label: 'Rejected',     bg: '#f3f4f6', color: '#6b7280' }, // gray
  completed: { label: 'Ready to post', bg: '#fff4d6', color: '#854d0e' }, // amber — distinct from posted
  // Publish lifecycle (override idea status when set)
  scheduled: { label: 'Scheduled',    bg: '#c7d2fe', color: '#3730a3' }, // indigo
  posted:    { label: 'Posted',       bg: '#d1fae5', color: '#065f46' }, // green
};

// Resolve status taking publish state into account (posted > scheduled > base idea status).
export function resolveStatusKey(
  ideaStatus: string,
  publishStatus?: string | null,
): string {
  if (publishStatus === 'posted') return 'posted';
  if (publishStatus === 'scheduled') return 'scheduled';
  return ideaStatus;
}

export function useStatusColors() {
  function visual(statusKey: string): StatusVisual {
    return STATUS_VISUALS[statusKey] ?? STATUS_VISUALS.proposed;
  }

  return { visual, resolveStatusKey };
}

// Format/post-type palette — each content format gets its own color tag
export interface FormatVisual {
  label: string;
  bg: string;
  color: string;
}

const FORMAT_VISUALS: Record<string, FormatVisual> = {
  text_post:       { label: 'Text Post',     bg: '#dbeafe', color: '#1e40af' }, // blue
  text_with_image: { label: 'Post + Image',  bg: '#e0e7ff', color: '#4338ca' }, // indigo
  image_series:    { label: 'Image Series',  bg: '#fce7f3', color: '#9d174d' }, // pink
  video_script:    { label: 'Video Script',  bg: '#fee2e2', color: '#991b1b' }, // red
  carousel:        { label: 'Carousel',      bg: '#ede9fe', color: '#5b21b6' }, // violet
  stories:         { label: 'Stories',       bg: '#fef3c7', color: '#92400e' }, // amber
};

export function useFormatColors() {
  function visual(format: string): FormatVisual {
    return FORMAT_VISUALS[format] ?? { label: format, bg: '#f3f4f6', color: '#4b5563' };
  }

  return { visual };
}
