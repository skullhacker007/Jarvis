import os
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional

logger = logging.getLogger("NAVI_Skills")

class CustomSkill:
    def __init__(self, skill_id: str, name: str, description: str, triggers: List[str], action: str, target_template: str = ""):
        self.skill_id = skill_id
        self.name = name
        self.description = description
        self.triggers = [t.lower().strip() for t in triggers]
        self.action = action
        self.target_template = target_template

    def matches(self, prompt: str) -> bool:
        low = prompt.lower()
        return any(trig in low for trig in self.triggers)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.skill_id,
            "name": self.name,
            "description": self.description,
            "triggers": self.triggers,
            "action": self.action,
            "target_template": self.target_template
        }

class SkillsRegistry:
    """
    Dynamic Custom Skill & Plugin Registry:
    - Scans `skills/` directory for custom `.json` skill manifests and macros.
    - Matches user voice/text directives to installed custom skills.
    - Allows extending J.A.R.V.I.S. with zero binary recompilation.
    """

    def __init__(self, skills_dir: str = "skills"):
        self.skills_dir = Path(skills_dir)
        self.skills_dir.mkdir(parents=True, exist_ok=True)
        self.skills: Dict[str, CustomSkill] = {}
        self.load_all_skills()

    def load_all_skills(self):
        self.skills.clear()
        # Scan skills directory for json files
        for p in self.skills_dir.glob("*.json"):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    sid = data.get("id") or p.stem
                    skill = CustomSkill(
                        skill_id=sid,
                        name=data.get("name", sid),
                        description=data.get("description", ""),
                        triggers=data.get("triggers", []),
                        action=data.get("action", "run_cmd"),
                        target_template=data.get("target_template", "")
                    )
                    self.skills[sid] = skill
                    logger.info(f"Loaded custom skill: {skill.name} ({len(skill.triggers)} triggers)")
            except Exception as e:
                logger.warning(f"Failed to load skill manifest '{p.name}': {e}")

    def register_skill(self, skill: CustomSkill) -> bool:
        self.skills[skill.skill_id] = skill
        manifest_path = self.skills_dir / f"{skill.skill_id}.json"
        try:
            with open(manifest_path, "w", encoding="utf-8") as f:
                json.dump(skill.to_dict(), f, indent=2)
            return True
        except Exception as e:
            logger.error(f"Failed to persist skill manifest: {e}")
            return False

    def find_matching_skill(self, prompt: str) -> Optional[CustomSkill]:
        for skill in self.skills.values():
            if skill.matches(prompt):
                return skill
        return None

    def list_skills(self) -> List[Dict[str, Any]]:
        return [s.to_dict() for s in self.skills.values()]
