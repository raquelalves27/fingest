from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.goal import GoalCreate, GoalUpdate, GoalResponse, ContributionCreate
from app.services import goal_service

router = APIRouter(prefix="/goals", tags=["Metas"])


@router.get("", response_model=list[GoalResponse])
def list_goals(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    goals = goal_service.list_goals(db, current_user.id)
    return [goal_service.goal_with_progress(g) for g in goals]


@router.post("", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
def create_goal(
    payload: GoalCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    goal = goal_service.create_goal(db, current_user.id, payload)
    return goal_service.goal_with_progress(goal)


@router.put("/{goal_id}", response_model=GoalResponse)
def update_goal(
    goal_id: str,
    payload: GoalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goal = goal_service.update_goal(db, current_user.id, goal_id, payload)
    return goal_service.goal_with_progress(goal)


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(
    goal_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    goal_service.delete_goal(db, current_user.id, goal_id)


@router.post("/{goal_id}/contributions", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
def add_contribution(
    goal_id: str,
    payload: ContributionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goal = goal_service.add_contribution(db, current_user.id, goal_id, payload)
    return goal_service.goal_with_progress(goal)
