import json
import logging
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
import httpx
from google import genai
from google.genai import types
from app.services.settings_service import load_settings

logger = logging.getLogger(__name__)

class Scene(BaseModel):
    scene_number: int = Field(description="رقم المشهد بالترتيب")
    narration: str = Field(description="نص التعليق الصوتي باللغة العربية مع ضبط نطق سليم ومناسب للنيش")
    search_keywords: str = Field(description="English keywords for visuals: cartoon niches use 3D cartoon prompts (e.g. 'cute red 3D race car cartoon'), REAL niches use real-footage keywords (e.g. 'real red sports car drifting on road')")
    visual_description: str = Field(description="وصف المشهد البصري للمستخدم")

class VideoScript(BaseModel):
    title: str = Field(description="عنوان جذاب جداً للـ YouTube Shorts مع إيموجي")
    description: str = Field(description="وصف للفيديو مع هاشتاجات قوية تتضمن #Shorts")
    tags: List[str] = Field(description="قائمة الكلمات المفتاحية والوسوم")
    scenes: List[Scene] = Field(description="قائمة المشاهد من 3 إلى 6 مشاهد سريعة")

# Specialized Niche System Prompts
NICHE_PROMPTS = {
    "kids_cars": """أنت مخرج ومؤلف محتوى أطفال متخصص في فيديوهات سيارات السباق الكرتونية والشاحنات الممتعة (Kids Cars & Toy Vehicles).
الأسلوب المطلوب:
1. البداية (Hook): جملة افتتاحية مليئة بالحماس والمرح للأطفال وأصوات السيارات (مثل: "فرووووم! 🏎️ استعدوا لأقوى سباق اليوم!").
2. لغة الحوار: لغة عربية فصحى مبهجة وبسيطة وسهلة الفهم للأطفال الصغار، مع تشجيعهم على التفاعل.
3. وصف المرئيات (search_keywords): باللغة الإنجليزية حصراً، ويجب أن تصف شخصيات سيارات كرتونية ثلاثية الأبعاد بأسلوب Pixar اللطيف، مثال:
   - 'cute red 3D toy sports car smiling on a colorful rainbow race track'
   - 'big friendly monster truck with happy eyes driving through green hills 3D animation'
   - 'yellow race car crossing the finish line with fireworks and balloons 3D cartoon'
4. المدة والمشاهد: 3 إلى 5 مشاهد سريعة ومبهجة.""",

    "kids_alphabet": """أنت معلم ومؤلف محتوى أطفال تفاعلي متخصص في تعليم الحروف العربية والأرقام والألوان للأطفال الصغار (Alphabet & Numbers Educational).
الأسلوب المطلوب:
1. البداية (Hook): تحية مرحة تجذب الطفل فوراً مع لغز أو سؤال بسيط (مثل: "يا أبطال! من يخمن ما هو الحرف السري اليوم؟ 🌟").
2. لغة الحوار: عربية فصحى مشكولة، نطق بطيء وواضح، تكرار محبب للأطفال مع مثال شيق (مثل: سيارة، طائرة، قطار، تفاحة).
3. وصف المرئيات (search_keywords): باللغة الإنجليزية حصراً، تصف مشاهد كرتونية 3D مبهجة جداً مع الحرف أو المجسم، مثال:
   - 'cute 3D cartoon Arabic letter dancing with joyful eyes in a magical kindergarten'
   - 'colorful animated toy blocks showing letters with smiling little animals 3D'
    - 'cheerful cartoon kids clapping with floating glowing alphabet letters 3D Pixar style'""",

    "kids_stories": """أنت حكواتي أطفال محبوب تروي قصصاً قصيرة ممتعة بعبرة لطيفة قبل النوم (Kids Bedtime Stories).
الأسلوب المطلوب:
1. البداية (Hook): سؤال فضولي بصوت دافئ يجذب الطفل (مثل: "هل تعرفون ماذا فعل الأرنب الصغير عندما أضاع طريقه في الغابة؟ 🐰").
2. لغة الحوار: عربية فصحى بسيطة ودافئة، جمل قصيرة، نهاية سعيدة وعبرة واضحة (الصدق، المشاركة، الشجاعة).
3. وصف المرئيات (search_keywords): باللغة الإنجليزية حصراً، مشاهد كرتونية 3D دافئة ومبهجة، مثال:
    - 'cute 3D cartoon bunny lost in magical glowing forest Pixar style'
    - 'happy cartoon animal friends sharing picnic under rainbow 3D animation'
    - 'sleepy little bear listening to story in cozy wooden house 3D cartoon'""",

    "cinematic_story": """أنت حكواتي وكاتب قصص وسيناريوهات وثائقية ملهمة (Cinematic Wisdom & Moral Stories).
الأسلوب المطلوب:
1. البداية (Hook): جملة عميقة ومحيرة تدفع المستمع لإكمال القصة حتى النهاية.
2. لغة الحوار: لغة عربية بليغة وسلسة، ذات جرس موسيقي ونبرة حكمة وتشويق.
3. وصف المرئيات (search_keywords): باللغة الإنجليزية حصراً، تصف لقطات سينمائية تاريخية ذات إضاءة درامية، مثال:
   - 'wise old traveller walking through ancient desert ruins at golden hour cinematic'
   - 'dramatic candlelight illuminating an ancient book in a medieval library masterpiece'
   - 'shadowy figure standing on a stormy mountain peak cinematic concept art'""",

    "mystery_tales": """أنت كاتب قصص غموض وظواهر غريبة وأسرار تاريخية (Mystery & Unexplained Shorts).
الأسلوب المطلوب:
1. البداية (Hook): سؤال صادم أو سر غامض يوقف المشاهد (مثل: "هذا المكان على الأرض ممنوع دخوله لأي إنسان... والسبب مرعب!").
2. لغة الحوار: تشويقية، سريعة النبض، تزرع الفضول في كل ثانية.
3. وصف المرئيات (search_keywords): باللغة الإنجليزية حصراً، تصف أجواء غموض وإثارة سينمائية، مثال:
    - 'mysterious ancient temple hidden inside foggy rainforest cinematic 9:16'
    - 'dark cosmic portal opening over ancient pyramids dramatic lighting'""",

    "real_cars": """أنت صانع محتوى سيارات حقيقي محترف (Real Cars: reviews, races, facts) بأسلوب قنوات السيارات الشهيرة على يوتيوب.
الأسلوب المطلوب:
1. البداية (Hook): جملة قوية عن سيارة حقيقية تثير الحماس فوراً (مثل: "هذه السيارة تتسارع من صفر إلى 100 في ثانيتين فقط! 🔥").
2. لغة الحوار: عربية فصحى حماسية مليئة بأصوات المحركات والإثارة، معلومات حقيقية عن السرعة والقوة والسعر.
3. وصف المرئيات (search_keywords): باللغة الإنجليزية حصراً، ويجب أن تصف سيارات حقيقية تماماً — ممنوع منعاً باتاً أي كلمة كرتونية (NO cartoon, NO toy, NO 3D, NO Pixar, NO cute)، مثال:
    - 'real red sports car drifting on asphalt road smoke'
    - 'real luxury supercar night city street headlights'
    - 'real monster truck jumping dirt ramp action'
    - 'closeup real car engine revving exhaust flames'
4. المدة والمشاهد: 3 إلى 5 مشاهد سريعة مليئة بالحركة.""",

    "car_facts": """أنت مقدم برنامج معلومات وحقائق مذهلة عن السيارات الحقيقية (Car Facts & Comparisons).
الأسلوب المطلوب:
1. البداية (Hook): حقيقة صادمة عن سيارة حقيقية (مثل: "هل تعلم أن أغلى سيارة في العالم سعرها 140 مليون؟!").
2. لغة الحوار: عربية فصحى مشوقة، أرقام وحقائق ومقارنات بين سيارات حقيقية.
3. وصف المرئيات (search_keywords): باللغة الإنجليزية حصراً، سيارات حقيقية فقط — ممنوع الكرتون تماماً، مثال:
    - 'real supercar interior dashboard closeup driving'
    - 'real classic vintage car detail chrome headlight'
    - 'real race track cars overtaking speed motion'""",

    "general": """أنت كاتب سيناريو ومخرج محترف للفيديوهات القصيرة (YouTube Shorts & TikTok).
اصنع سكريبت سريع الإيقاع، جذاب ومثير للاهتمام (Retention مرتفع) مع Hook في أول 3 ثوانٍ وكلمات بحث بالإنجليزية للمشاهد."""
}

def _get_system_prompt(category: str, tone: str, target_duration_sec: int, custom_prompt: Optional[str] = None, scene_count: int = 0) -> str:
    base_niche = NICHE_PROMPTS.get(category, NICHE_PROMPTS["general"])

    if custom_prompt and custom_prompt.strip():
        base_niche = f"{custom_prompt}\n\n{base_niche}"

    scenes_rule = (
        f"- عدد المشاهد المطلوب: {scene_count} مشاهد بالضبط (لا أكثر ولا أقل)."
        if scene_count and scene_count >= 2
        else "- عدد المشاهد: بين 3 و 5 مشاهد سريعة."
    )

    return f"""{base_niche}

الإعدادات العامة:
- النمط العام المطلوب: {tone}
- المدة المستهدفة: {target_duration_sec} ثانية تقريباً.
{scenes_rule}
- المطلوب: مخرجات بصيغة JSON صارمة مطابقة للمخطط التالي:
  * title: عنوان جذاب مع إيموجي
  * description: وصف مع هاشتاجات #Shorts
  * tags: قائمة الكلمات المفتاحية
  * scenes: قائمة المشاهد (scene_number, narration, search_keywords, visual_description)
"""

def generate_with_gemini(api_key: str, model_name: str, prompt: str, system_prompt: str) -> Dict[str, Any]:
    client = genai.Client(api_key=api_key)
    target_model = model_name or "gemini-3.8-flash"
    if target_model in ("gemini-2.5-flash", "gemini-2.0-flash-exp"):
        target_model = "gemini-3.8-flash"

    # Multi-model fallback list in case Google deprecates a specific version
    models_to_try = [target_model]
    for fallback in ["gemini-3.8-flash", "gemini-2.0-flash", "gemini-1.5-flash"]:
        if fallback not in models_to_try:
            models_to_try.append(fallback)

    last_error = None
    for m in models_to_try:
        try:
            response = client.models.generate_content(
                model=m,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    response_mime_type="application/json",
                    response_schema=VideoScript,
                    temperature=0.75
                )
            )
            return json.loads(response.text)
        except Exception as e:
            err_msg = str(e)
            if "404" in err_msg or "no longer available" in err_msg or "NOT_FOUND" in err_msg:
                logger.warning(f"Gemini model '{m}' returned 404/not available. Trying fallback: {e}")
                last_error = e
                continue
            
            logger.warning(f"Gemini schema mode failed on '{m}', retrying plain JSON: {e}")
            try:
                response = client.models.generate_content(
                    model=m,
                    contents=f"{system_prompt}\n\n{prompt}\n\nStrictly JSON only.",
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.75
                    )
                )
                return json.loads(response.text)
            except Exception as e2:
                err_msg2 = str(e2)
                if "404" in err_msg2 or "no longer available" in err_msg2 or "NOT_FOUND" in err_msg2:
                    logger.warning(f"Gemini model '{m}' returned 404 on plain JSON retry. Trying next fallback.")
                    last_error = e2
                    continue
                raise e2

    raise last_error or RuntimeError("Failed to generate content with any Gemini model.")

def generate_with_openai_compatible(
    base_url: str,
    api_key: str,
    model: str,
    prompt: str,
    system_prompt: str
) -> Dict[str, Any]:
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.75
    }

    with httpx.Client(timeout=60.0) as client:
        res = client.post(base_url, headers=headers, json=payload)
        if res.status_code != 200:
            raise ValueError(f"Provider API error ({res.status_code}): {res.text}")
        data = res.json()
        raw_text = data["choices"][0]["message"]["content"]
        return json.loads(raw_text)

def regenerate_single_scene(
    category: str = "general",
    tone: str = "ممتع ومرح",
    current_narration: str = "",
    scene_number: int = 1
) -> Dict[str, Any]:
    """
    إعادة صياغة مشهد واحد فقط (نص جديد + كلمات بحث جديدة) مع الحفاظ على النيش والأسلوب.
    """
    settings = load_settings()
    llm_conf = settings.get("llm", {})
    provider = llm_conf.get("provider", "gemini")
    base_niche = NICHE_PROMPTS.get(category, NICHE_PROMPTS["general"])

    system_instruction = f"""{base_niche}

مهمتك الآن: إعادة صياغة المشهد رقم {scene_number} فقط بصياغة جديدة كلياً ومختلفة.
النص الحالي للمشهد: {current_narration}
الأسلوب المطلوب: {tone}
أخرج JSON فقط بهذه الحقول الثلاثة:
  * narration: نص التعليق الصوتي الجديد بالعربية
  * search_keywords: كلمات بحث إنجليزية جديدة للمرئيات
  * visual_description: وصف بصري مختصر بالعربية
"""

    if provider == "gemini":
        api_key = llm_conf.get("gemini_api_key")
        if not api_key:
            raise ValueError("مفتاح Gemini API غير مسجل في الإعدادات")
        return generate_with_gemini(api_key, llm_conf.get("model_name", "gemini-3.8-flash"),
                                    "أعد صياغة المشهد الآن.", system_instruction)

    model_map = {
        "openai": ("https://api.openai.com/v1/chat/completions", "openai_api_key", "gpt-4o-mini"),
        "groq": ("https://api.groq.com/openai/v1/chat/completions", "groq_api_key", "llama-3.3-70b-versatile"),
        "openrouter": ("https://openrouter.ai/api/v1/chat/completions", "openrouter_api_key", "deepseek/deepseek-chat"),
    }
    if provider in model_map:
        base_url, key_field, default_model = model_map[provider]
        api_key = llm_conf.get(key_field)
        if not api_key:
            raise ValueError(f"مفتاح {provider} API غير مسجل في الإعدادات")
        return generate_with_openai_compatible(
            base_url, api_key, llm_conf.get("model_name") or default_model,
            "أعد صياغة المشهد الآن.", system_instruction
        )

    api_key = llm_conf.get("gemini_api_key")
    return generate_with_gemini(api_key, "gemini-3.8-flash", "أعد صياغة المشهد الآن.", system_instruction)


def generate_script_from_prompt(
    user_prompt: str, 
    category: str = "general",
    tone: str = "ممتع ومرح", 
    target_duration_sec: int = 35,
    custom_system_prompt: Optional[str] = None,
    scene_count: int = 0
) -> Dict[str, Any]:
    """
    تحويل فكرة المستخدم إلى سيناريو مع دعم نيش الأطفال، القصص، أو البرومت المخصص
    scene_count: عدد المشاهد المطلوب (0 = تلقائي 3-5)
    """
    settings = load_settings()
    llm_conf = settings.get("llm", {})
    provider = llm_conf.get("provider", "gemini")

    system_instruction = _get_system_prompt(category, tone, target_duration_sec, custom_system_prompt, scene_count)
    user_query = f"الموضوع أو الفكرة المطلوبة: {user_prompt}"

    if provider == "gemini":
        api_key = llm_conf.get("gemini_api_key")
        if not api_key:
            raise ValueError("مفتاح Gemini API غير مسجل في الإعدادات")
        return generate_with_gemini(api_key, llm_conf.get("model_name", "gemini-3.8-flash"), user_query, system_instruction)

    elif provider == "openai":
        api_key = llm_conf.get("openai_api_key")
        if not api_key:
            raise ValueError("مفتاح OpenAI API غير مسجل في الإعدادات")
        model = llm_conf.get("model_name") or "gpt-4o-mini"
        return generate_with_openai_compatible(
            "https://api.openai.com/v1/chat/completions",
            api_key,
            model,
            user_query,
            system_instruction
        )

    elif provider == "groq":
        api_key = llm_conf.get("groq_api_key")
        if not api_key:
            raise ValueError("مفتاح Groq API غير مسجل في الإعدادات")
        model = llm_conf.get("model_name") or "llama-3.3-70b-versatile"
        return generate_with_openai_compatible(
            "https://api.groq.com/openai/v1/chat/completions",
            api_key,
            model,
            user_query,
            system_instruction
        )

    elif provider == "openrouter":
        api_key = llm_conf.get("openrouter_api_key")
        if not api_key:
            raise ValueError("مفتاح OpenRouter API غير مسجل في الإعدادات")
        model = llm_conf.get("model_name") or "deepseek/deepseek-chat"
        return generate_with_openai_compatible(
            "https://openrouter.ai/api/v1/chat/completions",
            api_key,
            model,
            user_query,
            system_instruction
        )

    else:
        api_key = llm_conf.get("gemini_api_key")
        return generate_with_gemini(api_key, "gemini-3.8-flash", user_query, system_instruction)


def generate_title_variations(
    title: str,
    description: str = "",
    category: str = "general",
    tone: str = "حماسي وملهم",
    count: int = 3
) -> Dict[str, Any]:
    """
    توليد عناوين بديلة جذابة بنفس روح العنوان الأصلي (لزيادة CTR).
    """
    settings = load_settings()
    llm_conf = settings.get("llm", {})
    provider = llm_conf.get("provider", "gemini")

    system_instruction = (
        "أنت خبير عناوين يوتيوب شورتس. ولّد عناوين بديلة قصيرة (أقل من 100 حرف) "
        "جذابة ومثيرة للفضول مع إيموجي مناسب، بنفس موضوع العنوان الأصلي. "
        f"أخرج JSON فقط بهذا الشكل: {{\"titles\": [\"عنوان1\", \"عنوان2\", ...]}} "
        f"بعدد {count} عناوين."
    )
    user_query = f"العنوان الأصلي: {title}\nالوصف: {description}\nالفئة: {category}\nالأسلوب: {tone}"

    if provider == "gemini":
        api_key = llm_conf.get("gemini_api_key")
        if not api_key:
            raise ValueError("مفتاح Gemini API غير مسجل في الإعدادات")
        return generate_with_gemini(api_key, llm_conf.get("model_name", "gemini-3.8-flash"),
                                    user_query, system_instruction)

    model_map = {
        "openai": ("https://api.openai.com/v1/chat/completions", "openai_api_key", "gpt-4o-mini"),
        "groq": ("https://api.groq.com/openai/v1/chat/completions", "groq_api_key", "llama-3.3-70b-versatile"),
        "openrouter": ("https://openrouter.ai/api/v1/chat/completions", "openrouter_api_key", "deepseek/deepseek-chat"),
    }
    if provider in model_map:
        base_url, key_field, default_model = model_map[provider]
        api_key = llm_conf.get(key_field)
        if not api_key:
            raise ValueError(f"مفتاح {provider} API غير مسجل في الإعدادات")
        return generate_with_openai_compatible(
            base_url, api_key, llm_conf.get("model_name") or default_model,
            user_query, system_instruction
        )

    api_key = llm_conf.get("gemini_api_key")
    return generate_with_gemini(api_key, "gemini-3.8-flash", user_query, system_instruction)
