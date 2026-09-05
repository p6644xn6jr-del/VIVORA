-- VIVORA Lab only.
-- Non-destructive data patch for the existing AI demo tournament.
-- Apply manually in the VIVORA Lab Supabase SQL Editor only.
-- Do not run this against the team or production Supabase project.

update public.tournaments
set
  ai_criteria = '左右対称性：40点。左右の輪郭、傾き、重心のずれを画像から確認し、左右が均整に近いほど高く評価する。三辺のバランス：30点。三角形の三辺の長さと全体比率を画像から確認し、三辺のバランスが近いほど高く評価する。頂点の明確さ：30点。三角形として3つの頂点が明確に見えるか、角がつぶれていないかを画像から確認して評価する。合計100点。',
  evaluation_provider = 'openai',
  evaluation_version = 'v1',
  ai_score_min = 0,
  ai_score_max = 100,
  unit = '点',
  decimal_places = 1,
  direction = 'highest',
  rule = 'おにぎり全体が見える画像を投稿してください。AI評価は先頭画像1枚を対象にします。'
where title = 'おにぎり三角形王';
