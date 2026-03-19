// Data Service Layer — Supabase backend
// All methods are async and use window._sb (Supabase client)

const Utils = {
    generateId: () => '_' + Math.random().toString(36).substr(2, 9),
    getToday: () => new Date().toISOString().split('T')[0],
    getLocalDate: (date, deltaDays = 0) => {
        const d = new Date(date + 'T00:00:00');
        d.setDate(d.getDate() + deltaDays);
        return d.toISOString().split('T')[0];
    }
};

const Api = {

    // ── Videos ──────────────────────────────────────────────

    getVideos: async () => {
        const { data, error } = await window._sb
            .from('videos')
            .select('*')
            .order('created_at', { ascending: true });
        if (error) { console.error('getVideos', error); return []; }
        // Normalize sub_category → subCategory for template compatibility
        return (data || []).map(v => ({ ...v, subCategory: v.sub_category }));
    },

    addVideo: async (videoData) => {
        const user = await window.AuthUtils.getUser();
        if (!user) return null;
        const row = {
            user_id:      user.id,
            title:        videoData.title,
            link:         videoData.link,
            bvid:         videoData.bvid || '',
            duration:     videoData.duration || '',
            category:     videoData.category || '',
            sub_category: videoData.subCategory || videoData.sub_category || videoData.part || '',
            features:     videoData.features || [],
            plays:        videoData.plays || '',
            type:         videoData.type || 'strength',
            preset:       false
        };
        const { data, error } = await window._sb.from('videos').insert([row]).select().single();
        if (error) { console.error('addVideo', error); return null; }
        return { ...data, subCategory: data.sub_category };
    },

    deleteVideo: async (id) => {
        const { error } = await window._sb.from('videos').delete().eq('id', id);
        if (error) console.error('deleteVideo', error);
    },

    // ── Plans ────────────────────────────────────────────────

    getPlan: async (dateStr) => {
        const { data, error } = await window._sb
            .from('plans')
            .select('*')
            .eq('date', dateStr)
            .maybeSingle();
        if (error) { console.error('getPlan', error); return { videos: [], totalCalories: 0 }; }
        if (!data) return { videos: [], totalCalories: 0 };
        return { videos: data.videos || [], totalCalories: data.total_calories || 0 };
    },

    savePlan: async (dateStr, planData) => {
        const user = await window.AuthUtils.getUser();
        if (!user) return;
        const row = {
            user_id:         user.id,
            date:            dateStr,
            videos:          planData.videos || [],
            total_calories:  planData.totalCalories || 0,
            updated_at:      new Date().toISOString()
        };
        const { error } = await window._sb
            .from('plans')
            .upsert(row, { onConflict: 'user_id,date' });
        if (error) console.error('savePlan', error);
    },

    addVideoToPlan: async (dateStr, video) => {
        const plan = await Api.getPlan(dateStr);
        plan.videos.push({
            id:       Utils.generateId(),
            videoId:  video.id,
            title:    video.title,
            link:     video.link || '',
            duration: 15,
            type:     video.type,
            completed: false
        });
        plan.totalCalories = Api.calcCalories(plan.videos);
        await Api.savePlan(dateStr, plan);
        return plan;
    },

    calcCalories: (videos) => {
        return videos.reduce((acc, v) => {
            const coeff = (v.type === 'cardio' || v.type === 'fatburn') ? 5 : 3;
            return acc + (v.duration || 0) * coeff;
        }, 0);
    },

    getAllPlans: async () => {
        const { data, error } = await window._sb
            .from('plans')
            .select('date, videos, total_calories');
        if (error) { console.error('getAllPlans', error); return {}; }
        // Convert array → { date: planObj } map
        const map = {};
        (data || []).forEach(row => {
            map[row.date] = { videos: row.videos || [], totalCalories: row.total_calories || 0 };
        });
        return map;
    },

    getVideoMapByIds: async (ids) => {
        const uniq = Array.from(new Set((ids || []).filter(Boolean)));
        if (!uniq.length) return {};
        const { data, error } = await window._sb
            .from('videos')
            .select('*')
            .in('id', uniq);
        if (error) { console.error('getVideoMapByIds', error); return {}; }
        const map = {};
        (data || []).forEach(v => {
            map[v.id] = { ...v, subCategory: v.sub_category };
        });
        return map;
    },

    getStreakInfo: async () => {
        const plans = await Api.getAllPlans();
        const completedDates = new Set(
            Object.keys(plans).filter(date => (plans[date].videos || []).some(v => v.completed))
        );
        const today = Utils.getToday();
        let cursor = completedDates.has(today) ? today : Utils.getLocalDate(today, -1);
        let current = 0;
        while (completedDates.has(cursor)) {
            current += 1;
            cursor = Utils.getLocalDate(cursor, -1);
        }
        return {
            current,
            milestones: [7, 14, 21, 30]
        };
    },

    // Local favorites per user (stored on device)
    getFavoriteVideoIds: async () => {
        const user = await window.AuthUtils.getUser();
        if (!user) return [];
        const key = `vf_favs_${user.id}`;
        try {
            const raw = localStorage.getItem(key);
            const arr = JSON.parse(raw || '[]');
            return Array.isArray(arr) ? arr : [];
        } catch (e) {
            console.error('getFavoriteVideoIds', e);
            return [];
        }
    },

    toggleFavoriteVideo: async (videoId) => {
        const user = await window.AuthUtils.getUser();
        if (!user || !videoId) return [];
        const key = `vf_favs_${user.id}`;
        const current = await Api.getFavoriteVideoIds();
        const set = new Set(current);
        if (set.has(videoId)) set.delete(videoId);
        else set.add(videoId);
        const next = Array.from(set);
        localStorage.setItem(key, JSON.stringify(next));
        return next;
    },

    // ── Profile ──────────────────────────────────────────────

    getProfileHistory: async () => {
        const { data, error } = await window._sb
            .from('profile_history')
            .select('*')
            .order('date', { ascending: false });
        if (error) { console.error('getProfileHistory', error); return []; }
        return data || [];
    },

    saveProfileEntry: async (formData) => {
        const user = await window.AuthUtils.getUser();
        if (!user) return;
        const today = Utils.getToday();
        const toNum = v => (v === '' || v === null || v === undefined) ? null : Number(v);
        const row = {
            user_id:  user.id,
            date:     today,
            height:   toNum(formData.height),
            weight:   toNum(formData.weight),
            shoulder: toNum(formData.shoulder),
            chest:    toNum(formData.chest),
            waist:    toNum(formData.waist),
            hips:     toNum(formData.hips),
            thigh:    toNum(formData.thigh),
            calf:     toNum(formData.calf)
        };
        // Upsert by user_id + date (update today's record if exists)
        const { error } = await window._sb
            .from('profile_history')
            .upsert(row, { onConflict: 'user_id,date' });
        if (error) console.error('saveProfileEntry', error);
    },

    getLatestProfile: async () => {
        const { data, error } = await window._sb
            .from('profile_history')
            .select('*')
            .order('date', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (error) { console.error('getLatestProfile', error); return null; }
        return data;
    },

    deleteProfileEntry: async (id) => {
        const { error } = await window._sb
            .from('profile_history')
            .delete()
            .eq('id', id);
        if (error) console.error('deleteProfileEntry', error);
    },

    // ── Play Counts ──────────────────────────────────────────
    // Returns { videoId: count } for all completed videos across all plans
    getVideoPlayCounts: async () => {
        const { data, error } = await window._sb
            .from('plans')
            .select('videos');
        if (error) { console.error('getVideoPlayCounts', error); return {}; }
        const counts = {};
        (data || []).forEach(row => {
            (row.videos || []).forEach(v => {
                if (v.completed && v.videoId) {
                    counts[v.videoId] = (counts[v.videoId] || 0) + 1;
                }
            });
        });
        return counts;
    }
};

window.AppApi = Api;
window.AppUtils = Utils;
