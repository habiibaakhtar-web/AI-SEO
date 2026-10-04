from typing import Literal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, HttpUrl

Severity = Literal["critical", "high", "medium", "low"]


class VerifiedIssue(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    id: UUID
    title: str = Field(min_length=1, max_length=300)
    category: Literal["technical", "on_page", "content"]
    severity: Severity
    page_url: HttpUrl
    description: str = Field(min_length=1, max_length=4000)
    why_it_matters: str = Field(min_length=1, max_length=4000)
    recommendation: str = Field(min_length=1, max_length=4000)


class Recommendation(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    issue_id: UUID
    recommendation: str = Field(min_length=1, max_length=4000)
    reason: str = Field(min_length=1, max_length=4000)
    priority: Severity
    suggested_text: str | None = Field(default=None, max_length=4000)


class RecommendationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    audit_id: UUID
    issues: list[VerifiedIssue] = Field(min_length=1, max_length=100)


class RecommendationResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    recommendations: list[Recommendation] = Field(max_length=100)

