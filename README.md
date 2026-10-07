# 까위키 v3 — 무료 인터넷 공개판

이 버전은 Node.js 서버 없이 GitHub Pages + Supabase로 실행됩니다.

## 1. Supabase 만들기

Supabase에서 무료 프로젝트를 만든 뒤 SQL Editor에서 `supabase.sql` 전체를 실행합니다.

Free 플랜에는 무료 프로젝트와 Postgres 데이터베이스가 제공됩니다.

## 2. API 정보 넣기

Supabase Dashboard → Project Settings → API에서

- Project URL
- anon/publishable key

를 확인합니다.

`js/config.js`에 넣습니다.

**service_role 키는 절대 넣지 마세요.**

## 3. GitHub에 올리기

GitHub에서 새 PUBLIC repository를 만들고 이 폴더 안의 파일들을 업로드합니다.

GitHub Free에서는 public repository에서 GitHub Pages를 사용할 수 있습니다.

Repository → Settings → Pages → Deploy from a branch → `main` / `/ (root)` → Save

잠시 기다리면:

https://깃허브아이디.github.io/저장소이름/

형태의 주소가 생깁니다.

문서 주소는:

https://깃허브아이디.github.io/저장소이름/?title=농구

처럼 사용할 수 있습니다.

## 중요

이 v3는 로그인 없이 누구나 편집할 수 있는 테스트용 위키입니다.
공개 위키로 오래 운영하려면 다음 단계에서 회원가입/로그인과 관리자 권한을 추가하는 것을 권장합니다.
