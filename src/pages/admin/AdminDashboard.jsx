import React from 'react';
import { ContentManager } from '../../components/admin/ContentManager';
import { PrayerPanel } from '../../components/admin/Panels';
import { TestimoniesPanel } from '../../components/admin/TestimoniesPanel';
import { AnnouncementsPanel } from '../../components/admin/AnnouncementsPanel';

const BLOG_FIELDS = [
  { name: 'title', label: 'Title', type: 'text' },
  { name: 'excerpt', label: 'Excerpt', type: 'textarea', rows: 2 },
  { name: 'content', label: 'Content', type: 'textarea', rows: 8 },
  { name: 'author', label: 'Author', type: 'text' },
  { name: 'category', label: 'Category', type: 'text' },
  { name: 'image', label: 'Image URL', type: 'image' },
  { name: 'featured', label: 'Featured', type: 'switch', hint: 'Show as the highlighted post' },
  { name: 'published', label: 'Published', type: 'switch', hint: 'Visible on the website' },
];
const EVENT_FIELDS = [
  { name: 'title', label: 'Title', type: 'text' },
  { name: 'date', label: 'Date', type: 'date' },
  { name: 'time', label: 'Time', type: 'text' },
  { name: 'location', label: 'Location', type: 'text' },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'featured', label: 'Featured', type: 'switch', hint: 'Highlight this event' },
];
const SERMON_FIELDS = [
  { name: 'title', label: 'Title', type: 'text' },
  { name: 'pastor', label: 'Speaker', type: 'text' },
  { name: 'date', label: 'Date', type: 'date' },
  { name: 'series', label: 'Series', type: 'text' },
  { name: 'scripture', label: 'Scripture', type: 'text' },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'videoUrl', label: 'Video URL', type: 'text' },
  { name: 'audioUrl', label: 'Audio URL', type: 'text' },
];
const MINISTRY_FIELDS = [
  { name: 'name', label: 'Name', type: 'text' },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'leader', label: 'Leader', type: 'text' },
  { name: 'meetingTime', label: 'Meeting Time', type: 'text' },
  { name: 'image', label: 'Image URL', type: 'image' },
];
const HERO_FIELDS = [
  { name: 'title', label: 'Headline', type: 'text' },
  { name: 'subtitle', label: 'Subtitle', type: 'text' },
  { name: 'description', label: 'Description', type: 'textarea', rows: 2 },
  { name: 'backgroundImage', label: 'Background Image', type: 'image', hint: 'Upload or paste a URL — this is the full-bleed hero photo' },
  { name: 'ctaText', label: 'Button Text', type: 'text' },
  { name: 'ctaLink', label: 'Button Link (e.g. /about, /contact)', type: 'text' },
];

export const HeroCms = () => (
  <ContentManager
    title="Homepage banners"
    path="/hero-slides?all=1"
    fields={HERO_FIELDS}
    columns={['title', 'subtitle']}
    feature="home.hero"
  />
);
export const BlogCms = () => <ContentManager title="Blog" path="/blog?all=1" fields={BLOG_FIELDS} columns={['title', 'category', 'author']} feature="blog.posts" />;
export const EventsCms = () => <ContentManager title="Events" path="/events?all=1" fields={EVENT_FIELDS} columns={['title', 'date', 'location']} feature="events.list" />;
export const SermonsCms = () => <ContentManager title="Sermons" path="/sermons?all=1" fields={SERMON_FIELDS} columns={['title', 'pastor', 'series']} feature="sermons.list" />;
export const MinistriesCms = () => <ContentManager title="Ministries" path="/ministries?all=1" fields={MINISTRY_FIELDS} columns={['name', 'leader', 'meetingTime']} feature="ministries.list" />;
export const TestimoniesCms = () => <TestimoniesPanel />;
export const PrayersCms = () => <PrayerPanel />;
export const AnnouncementsCms = () => <AnnouncementsPanel />;

